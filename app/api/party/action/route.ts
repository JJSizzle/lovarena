import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthProfile } from "@/lib/auth/api-auth";
import { assertPartyMember } from "@/lib/party/party-auth";
import {
  buildPartyState,
  maybeAdvanceTriviaOnTimeout,
  maybeAdvanceTriviaRound,
  skipTriviaQuestion,
  startNextRound,
  syncPartyRoom,
} from "@/lib/party/party-state";
import { parseJsonBody } from "@/lib/api/parse-json-body";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthProfile();
    if ("error" in auth) return auth.error;

    const parsed = await parseJsonBody<{
      partyId?: string;
      action?: string;
      optionId?: string;
    }>(req);
    if (!parsed.ok) return parsed.response;
    const { partyId, action, optionId } = parsed.data;
    if (!partyId || !action) {
      return NextResponse.json({ error: "Missing partyId or action" }, { status: 400 });
    }

    const membership = await assertPartyMember(partyId, auth.profile.id);
    if ("error" in membership) return membership.error;

    const supabase = createAdminClient();
    let room = membership.room;

    if (action === "end") {
      if (membership.role !== "host") {
        return NextResponse.json(
          { error: "Only the host can end the party." },
          { status: 403 }
        );
      }
      if (room.status === "ended") {
        return NextResponse.json({ error: "Party already ended." }, { status: 400 });
      }

      const { data: updated } = await supabase
        .from("party_rooms")
        .update({
          status: "ended",
          updated_at: new Date().toISOString(),
        })
        .eq("id", partyId)
        .select("*")
        .single();

      if (updated) room = updated;

      const party = await buildPartyState(
        supabase,
        room,
        auth.profile.id,
        req.nextUrl.origin
      );

      return NextResponse.json({ party });
    }

    if (room.status !== "playing") {
      return NextResponse.json({ error: "Game not in progress." }, { status: 400 });
    }

    if (room.game_mode === "hangout") {
      return NextResponse.json(
        { error: "Hangout parties have no game actions." },
        { status: 400 }
      );
    }

    if (action === "vote") {
      if (room.game_mode !== "trivia" || room.phase !== "voting") {
        return NextResponse.json({ error: "Not accepting votes right now." }, { status: 400 });
      }
      if (!optionId || typeof optionId !== "string") {
        return NextResponse.json({ error: "Missing optionId" }, { status: 400 });
      }

      const options = Array.isArray(room.current_options)
        ? room.current_options
        : [];
      const valid = options.some(
        (opt: { id?: string }) => opt.id === optionId
      );
      if (!valid) {
        return NextResponse.json({ error: "Invalid option" }, { status: 400 });
      }

      await supabase.from("party_votes").upsert(
        {
          party_id: partyId,
          profile_id: auth.profile.id,
          round_index: room.round_index,
          option_id: optionId,
        },
        { onConflict: "party_id,profile_id,round_index" }
      );

      const advanced = await maybeAdvanceTriviaRound(supabase, room);
      if (advanced) room = advanced;
      else {
        const timedOut = await maybeAdvanceTriviaOnTimeout(supabase, room);
        if (timedOut) room = timedOut;
      }
    } else if (action === "timeout") {
      const timedOut = await maybeAdvanceTriviaOnTimeout(supabase, room);
      if (timedOut) room = timedOut;
    } else if (action === "next") {
      if (room.game_mode === "prompts") {
        if (room.phase !== "discussion") {
          return NextResponse.json({ error: "Wait for the current card." }, { status: 400 });
        }
      } else if (room.phase !== "reveal") {
        return NextResponse.json(
          { error: "Finish voting and reveal before the next question." },
          { status: 400 }
        );
      }

      const updated = await startNextRound(supabase, room);
      if (!updated) {
        return NextResponse.json({ error: "Could not load next round" }, { status: 500 });
      }
      room = updated;
    } else if (action === "skip") {
      if (membership.role !== "host") {
        return NextResponse.json(
          { error: "Only the host can skip." },
          { status: 403 }
        );
      }
      if (room.game_mode !== "trivia") {
        return NextResponse.json(
          { error: "Skip is only for trivia." },
          { status: 400 }
        );
      }
      const updated = await skipTriviaQuestion(supabase, room);
      if (!updated) {
        return NextResponse.json(
          { error: "Cannot skip right now." },
          { status: 400 }
        );
      }
      room = updated;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const { data: latest } = await supabase
      .from("party_rooms")
      .select("*")
      .eq("id", partyId)
      .single();

    const synced = await syncPartyRoom(
      supabase,
      (latest ?? room) as typeof room
    );

    const party = await buildPartyState(
      supabase,
      synced,
      auth.profile.id,
      req.nextUrl.origin
    );

    return NextResponse.json({ party });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

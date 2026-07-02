export type NewDmDetail = {
  id: string;
  senderId: string;
  senderUsername: string;
  preview: string;
  createdAt: string;
};

export const NEW_DM_EVENT = "lovarena:new-dm";

export function dispatchNewDm(detail: NewDmDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NewDmDetail>(NEW_DM_EVENT, { detail }));
}

"use client";

import {
  REPORT_DETAILS_PLACEHOLDER,
  REPORT_REASONS,
} from "@/lib/moderation/report-reasons";

type ReportReasonFieldsProps = {
  reason: string;
  onReasonChange: (reason: string) => void;
  details: string;
  onDetailsChange: (details: string) => void;
  selectClassName: string;
  textareaClassName: string;
  textareaRows?: number;
};

export function ReportReasonFields({
  reason,
  onReasonChange,
  details,
  onDetailsChange,
  selectClassName,
  textareaClassName,
  textareaRows = 3,
}: ReportReasonFieldsProps) {
  return (
    <>
      <select
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        className={selectClassName}
      >
        {REPORT_REASONS.map((row) => (
          <option key={row.value} value={row.value}>
            {row.label}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => onDetailsChange(e.target.value)}
        placeholder={REPORT_DETAILS_PLACEHOLDER}
        rows={textareaRows}
        className={textareaClassName}
      />
    </>
  );
}

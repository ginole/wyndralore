export interface WireDetailRow {
  label: string;
  value: string;
}

/** Builds the ordered list of "pay to" rows shown on the order page, skipping unset fields. */
export function getWiseWireDetails(): WireDetailRow[] {
  const rows: WireDetailRow[] = [
    { label: "Pay to", value: process.env.WISE_ACCOUNT_NAME ?? "" },
    { label: "Account number", value: process.env.WISE_ACCOUNT_NUMBER ?? "" },
    { label: "Routing number", value: process.env.WISE_ROUTING_NUMBER ?? "" },
    { label: "SWIFT/BIC", value: process.env.WISE_SWIFT_BIC ?? "" },
    { label: "Bank address", value: process.env.WISE_BANK_ADDRESS ?? "" },
  ];
  return rows.filter((r) => r.value.trim().length > 0);
}

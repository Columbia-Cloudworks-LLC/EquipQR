/**
 * Normalized contact entry derived from a documented QBO Customer field.
 * At most 4 entries per customer: primary_email, primary_phone, mobile, fax.
 */
export interface QBODerivedContact {
  sourceField: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface QBOCustomerContactFields {
  Id: string;
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Mobile?: { FreeFormNumber: string };
  Fax?: { FreeFormNumber: string };
}

/**
 * Build up to four normalized contact entries from documented QBO Customer fields.
 * Does NOT invent a separate multi-contact collection; only documented fields are used.
 */
export function buildQBOContacts(c: QBOCustomerContactFields): QBODerivedContact[] {
  const displayName =
    [c.GivenName, c.FamilyName].filter(Boolean).join(" ") || c.DisplayName;
  const contacts: QBODerivedContact[] = [];

  const email = c.PrimaryEmailAddr?.Address;
  if (email) {
    contacts.push({ sourceField: "primary_email", name: displayName, role: "Primary email", email });
  }

  const primaryPhone = c.PrimaryPhone?.FreeFormNumber;
  if (primaryPhone) {
    contacts.push({ sourceField: "primary_phone", name: displayName, role: "Primary phone", phone: primaryPhone });
  }

  const mobile = c.Mobile?.FreeFormNumber;
  if (mobile) {
    contacts.push({ sourceField: "mobile", name: displayName, role: "Mobile", phone: mobile });
  }

  const fax = c.Fax?.FreeFormNumber;
  if (fax) {
    contacts.push({ sourceField: "fax", name: displayName, role: "Fax", phone: fax });
  }

  return contacts;
}

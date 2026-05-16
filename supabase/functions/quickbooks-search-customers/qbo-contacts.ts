/**
 * Normalized contact entry derived from a documented QBO Customer field.
 * Up to five entries per customer: primary_email, primary_phone, mobile, fax, alternate_phone.
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
  AlternatePhone?: { FreeFormNumber: string };
}

/**
 * Build normalized contact entries from documented QBO Customer fields.
 * Returns up to five entries: primary_email, primary_phone, mobile, fax, alternate_phone.
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

  const alternatePhone = c.AlternatePhone?.FreeFormNumber;
  if (alternatePhone) {
    contacts.push({ sourceField: "alternate_phone", name: displayName, role: "Alternate phone", phone: alternatePhone });
  }

  return contacts;
}

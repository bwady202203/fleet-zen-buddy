// =====================================================================
// ZATCA UBL 2.1 XML generation (PINT-SA compliant)
// ---------------------------------------------------------------------
// Builds an Invoice/CreditNote/DebitNote XML compliant with the Saudi
// e-Invoicing standard (PINT-SA, UBL 2.1) used by ZATCA Phase 2.
//
// Outputs:
//   - The unsigned invoice XML (ready to be hashed & signed)
//   - The base64 SHA-256 invoice hash (required as Previous Invoice Hash
//     for the next document and as input to the digital signature)
//
// This module runs in the browser (uses Web Crypto for SHA-256) so users
// can preview, download and copy the XML. The actual XAdES signature is
// produced server-side by the `zatca-submit` edge function using the
// merchant's private key (stored in `zatca_certificates`).
// =====================================================================

export interface ZatcaXmlSeller {
  name_ar: string;
  name_en?: string;
  vat_number: string;
  crn?: string;
  street_name?: string;
  building_number?: string;
  plot_identification?: string;
  district?: string;
  city?: string;
  postal_code?: string;
  additional_number?: string;
  country_code?: string;
}

export interface ZatcaXmlBuyer {
  name?: string;
  vat_number?: string;
  street_name?: string;
  building_number?: string;
  city?: string;
  postal_code?: string;
  district?: string;
  country_code?: string;
}

export interface ZatcaXmlLine {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number; // percent, e.g. 15
  unit_code?: string; // e.g. PCE, KGM
}

export interface BuildXmlInput {
  invoice_uuid: string; // UUID v4
  invoice_number: string;
  invoice_type: "standard" | "simplified"; // standard = B2B (Tax), simplified = B2C
  invoice_subtype: "invoice" | "credit" | "debit";
  issue_date: string; // YYYY-MM-DD
  issue_time: string; // HH:MM:SS
  icv: number; // Invoice Counter Value
  pih?: string | null; // Previous Invoice Hash (base64). Use the seed for the very first invoice.
  currency?: string; // default SAR
  seller: ZatcaXmlSeller;
  buyer?: ZatcaXmlBuyer | null;
  lines: ZatcaXmlLine[];
  notes?: string | null;
}

export interface BuildXmlResult {
  xml: string;
  invoice_hash: string; // base64(SHA-256(canonical xml)) — simplified canonicalisation
  totals: { subtotal: number; tax: number; total: number };
}

// Genesis (initial) Previous-Invoice-Hash defined by ZATCA for ICV=1
export const ZATCA_GENESIS_PIH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

const xmlEscape = (s: string | number | undefined | null) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const num = (n: number, dp = 2) => (Number.isFinite(n) ? n : 0).toFixed(dp);

// ZATCA InvoiceTypeCode: 388=Tax invoice, 381=Credit note, 383=Debit note
const subtypeCode = (sub: BuildXmlInput["invoice_subtype"]) =>
  sub === "credit" ? "381" : sub === "debit" ? "383" : "388";

// "name" attribute on InvoiceTypeCode: 7-char string of 0/1
//   pos1 = Invoice Transaction (0=invoice, 1=...)
//   pos2 = 1 if Tax Invoice (B2B), 0 otherwise
//   pos3 = 1 if Simplified (B2C), 0 otherwise
//   rest = future use (zeros)
const subtypeName = (type: BuildXmlInput["invoice_type"]) =>
  type === "standard" ? "0100000" : "0200000";

async function sha256Base64(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function buildSellerParty(s: ZatcaXmlSeller): string {
  return `
    <cac:AccountingSupplierParty>
      <cac:Party>
        <cac:PartyIdentification>
          <cbc:ID schemeID="CRN">${xmlEscape(s.crn || "")}</cbc:ID>
        </cac:PartyIdentification>
        <cac:PostalAddress>
          <cbc:StreetName>${xmlEscape(s.street_name || "")}</cbc:StreetName>
          <cbc:BuildingNumber>${xmlEscape(s.building_number || "")}</cbc:BuildingNumber>
          <cbc:PlotIdentification>${xmlEscape(s.plot_identification || "")}</cbc:PlotIdentification>
          <cbc:CitySubdivisionName>${xmlEscape(s.district || "")}</cbc:CitySubdivisionName>
          <cbc:CityName>${xmlEscape(s.city || "")}</cbc:CityName>
          <cbc:PostalZone>${xmlEscape(s.postal_code || "")}</cbc:PostalZone>
          <cbc:CountrySubentity>${xmlEscape(s.district || "")}</cbc:CountrySubentity>
          <cac:Country>
            <cbc:IdentificationCode>${xmlEscape(s.country_code || "SA")}</cbc:IdentificationCode>
          </cac:Country>
        </cac:PostalAddress>
        <cac:PartyTaxScheme>
          <cbc:CompanyID>${xmlEscape(s.vat_number)}</cbc:CompanyID>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:PartyTaxScheme>
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${xmlEscape(s.name_ar)}</cbc:RegistrationName>
        </cac:PartyLegalEntity>
      </cac:Party>
    </cac:AccountingSupplierParty>`;
}

function buildBuyerParty(b: ZatcaXmlBuyer | null | undefined): string {
  if (!b || (!b.name && !b.vat_number)) return "";
  return `
    <cac:AccountingCustomerParty>
      <cac:Party>
        ${
          b.vat_number
            ? `<cac:PartyIdentification><cbc:ID schemeID="VAT">${xmlEscape(b.vat_number)}</cbc:ID></cac:PartyIdentification>`
            : ""
        }
        <cac:PostalAddress>
          <cbc:StreetName>${xmlEscape(b.street_name || "")}</cbc:StreetName>
          <cbc:BuildingNumber>${xmlEscape(b.building_number || "")}</cbc:BuildingNumber>
          <cbc:CitySubdivisionName>${xmlEscape(b.district || "")}</cbc:CitySubdivisionName>
          <cbc:CityName>${xmlEscape(b.city || "")}</cbc:CityName>
          <cbc:PostalZone>${xmlEscape(b.postal_code || "")}</cbc:PostalZone>
          <cac:Country>
            <cbc:IdentificationCode>${xmlEscape(b.country_code || "SA")}</cbc:IdentificationCode>
          </cac:Country>
        </cac:PostalAddress>
        ${
          b.vat_number
            ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlEscape(b.vat_number)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
            : ""
        }
        <cac:PartyLegalEntity>
          <cbc:RegistrationName>${xmlEscape(b.name || "")}</cbc:RegistrationName>
        </cac:PartyLegalEntity>
      </cac:Party>
    </cac:AccountingCustomerParty>`;
}

function buildLine(l: ZatcaXmlLine, idx: number, currency: string): { xml: string; lineExt: number; lineTax: number } {
  const lineExt = +(l.quantity * l.unit_price).toFixed(2);
  const lineTax = +(lineExt * (l.tax_rate / 100)).toFixed(2);
  const lineTotal = +(lineExt + lineTax).toFixed(2);
  const xml = `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${xmlEscape(l.unit_code || "PCE")}">${num(l.quantity, 6)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currency}">${num(lineExt)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currency}">${num(lineTax)}</cbc:TaxAmount>
        <cbc:RoundingAmount currencyID="${currency}">${num(lineTotal)}</cbc:RoundingAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${xmlEscape(l.description)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${num(l.tax_rate)}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currency}">${num(l.unit_price, 6)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
  return { xml, lineExt, lineTax };
}

export async function buildZatcaInvoiceXml(input: BuildXmlInput): Promise<BuildXmlResult> {
  const currency = input.currency || "SAR";
  const pih = input.pih || ZATCA_GENESIS_PIH;
  const docCode = subtypeCode(input.invoice_subtype);
  const docName = subtypeName(input.invoice_type);

  let subtotal = 0;
  let totalTax = 0;
  const lineXmls: string[] = [];
  input.lines.forEach((l, i) => {
    const { xml, lineExt, lineTax } = buildLine(l, i, currency);
    subtotal += lineExt;
    totalTax += lineTax;
    lineXmls.push(xml);
  });
  subtotal = +subtotal.toFixed(2);
  totalTax = +totalTax.toFixed(2);
  const total = +(subtotal + totalTax).toFixed(2);

  // The root element name differs between Invoice and CreditNote/DebitNote
  // but for both ZATCA expects <Invoice>. Subtype is conveyed via cbc:InvoiceTypeCode.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(input.invoice_number)}</cbc:ID>
  <cbc:UUID>${xmlEscape(input.invoice_uuid)}</cbc:UUID>
  <cbc:IssueDate>${xmlEscape(input.issue_date)}</cbc:IssueDate>
  <cbc:IssueTime>${xmlEscape(input.issue_time)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${docName}">${docCode}</cbc:InvoiceTypeCode>
  ${input.notes ? `<cbc:Note>${xmlEscape(input.notes)}</cbc:Note>` : ""}
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${input.icv}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEscape(pih)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  ${buildSellerParty(input.seller)}
  ${buildBuyerParty(input.buyer)}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${num(totalTax)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${num(subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${num(totalTax)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${num(subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${num(subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${num(total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${num(total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineXmls.join("")}
</Invoice>`;

  // Simplified canonicalisation: collapse whitespace between tags before hashing.
  // ZATCA's spec requires C14N 1.1 with specific exclusions, which is implemented
  // by the signing service. This client-side hash is for preview / PIH chaining.
  const canonical = xml.replace(/>\s+</g, "><").trim();
  const invoice_hash = await sha256Base64(canonical);

  return { xml, invoice_hash, totals: { subtotal, tax: totalTax, total } };
}

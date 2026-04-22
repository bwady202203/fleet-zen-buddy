-- ZATCA digital certificates (PCSID / CCSID) storage
CREATE TABLE IF NOT EXISTS public.zatca_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  -- Type of certificate: compliance (CCSID — sandbox) or production (PCSID — live)
  certificate_type text NOT NULL DEFAULT 'production' CHECK (certificate_type IN ('compliance','production')),
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox','simulation','production')),
  -- A friendly label (e.g. "Riyadh Branch POS-1")
  label text NOT NULL,
  -- The Base64 BinarySecurityToken returned by ZATCA (the X.509 certificate, base64)
  binary_security_token text NOT NULL,
  -- The "secret" returned by ZATCA, used as the password in Basic auth
  secret text NOT NULL,
  -- The private key (PEM, ECDSA secp256k1) generated locally and used to sign invoices
  private_key_pem text NOT NULL,
  -- Optional CSR that was sent to ZATCA
  csr_pem text,
  -- Common Name on the cert (matches device_common_name in zatca_settings)
  common_name text,
  -- Validity dates (parsed by client, optional)
  valid_from timestamptz,
  valid_to timestamptz,
  -- Only one certificate is "active" per environment at a time
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_zatca_certificates_env ON public.zatca_certificates(environment, is_active);

ALTER TABLE public.zatca_certificates ENABLE ROW LEVEL SECURITY;

-- Only admins/accountants can view or manage certificates (they hold private keys)
CREATE POLICY "Admins/accountants view zatca certificates"
  ON public.zatca_certificates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'accountant'::app_role));

CREATE POLICY "Admins/accountants manage zatca certificates"
  ON public.zatca_certificates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'accountant'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'accountant'::app_role));

CREATE TRIGGER zatca_certificates_updated_at
  BEFORE UPDATE ON public.zatca_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
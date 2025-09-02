-- Add billing exemption for VA Enterprises for development testing
INSERT INTO public.billing_exemptions (
  organization_id,
  exemption_type,
  exemption_value,
  reason,
  expires_at,
  is_active,
  granted_by,
  granted_at
) VALUES (
  '96061a65-7e91-4ed3-9df1-282ff19a8471',
  'user_licenses',
  5,
  'Testing exemption for development - allows testing member addition and organization switching',
  NULL,
  true,
  auth.uid(),
  now()
);

-- Verify the exemption by checking slot availability
SELECT * FROM get_organization_slot_availability_with_exemptions('96061a65-7e91-4ed3-9df1-282ff19a8471');
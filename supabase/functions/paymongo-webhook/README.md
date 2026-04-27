# PayMongo Webhook (Supabase Edge Function)

## Required Secrets

Set these in Supabase project secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMONGO_WEBHOOK_SECRET`

## Deploy

```bash
supabase functions deploy paymongo-webhook --no-verify-jwt
```

## PayMongo Webhook URL

```text
https://<your-project-ref>.functions.supabase.co/paymongo-webhook
```

Use this URL in PayMongo webhook settings.

## Important Flow

- Create `registration_forms` + `payment_orders` before redirecting checkout.
- Include `merchant_reference` in PayMongo metadata.
- Webhook updates `payment_orders.status`.
- DB trigger auto-updates registration to `paid`.
- Registration cannot be set to `confirmed` unless payment is `paid`.

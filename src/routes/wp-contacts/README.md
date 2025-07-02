# wp-contacts

Este módulo fornece endpoints para gerenciar contatos do WhatsApp (wp_contacts) via Supabase.

## Endpoints

- `GET /wp-contacts` — Lista todos os contatos
- `POST /wp-contacts` — Adiciona um novo contato (body: { name, phone })
- `DELETE /wp-contacts/:id` — Remove um contato pelo ID

A tabela utilizada é `wp_contacts` com os campos:

- id (UUID, PK)
- name (string)
- phone (string)
- created_at (timestamp)

export interface Contact {
  id: string;
  name: string;
  whatsapp: string;
  description?: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CreateContactDTO {
  name: string;
  whatsapp: string;
  description?: string;
  tags?: string[];
}

export interface UpdateContactDTO {
  name?: string;
  whatsapp?: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
}

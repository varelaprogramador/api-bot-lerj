import { supabase } from "@/lib/supabase";
import { Contact, CreateContactDTO, UpdateContactDTO } from "@/types/contact";

export const contactManager = {
  async createContact(contact: CreateContactDTO, userId: string) {
    const { data, error } = await supabase
      .from("contacts")
      .insert([
        {
          ...contact,
          created_by: userId,
          updated_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  },

  async updateContact(id: string, contact: UpdateContactDTO, userId: string) {
    const { data, error } = await supabase
      .from("contacts")
      .update({
        ...contact,
        updated_by: userId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  },

  async deleteContact(id: string, userId: string) {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("created_by", userId);

    if (error) throw error;
  },

  async getContact(id: string, userId: string) {
    const { data, error } = await supabase
      .from("contacts")
      .select()
      .eq("id", id)
      .eq("created_by", userId)
      .single();

    if (error) throw error;
    return data as Contact;
  },

  async listContacts(userId: string) {
    const { data, error } = await supabase
      .from("contacts")
      .select()
      .eq("created_by", userId)
      .order("name");

    if (error) throw error;
    return data as Contact[];
  },

  async listAllContacts() {
    const { data, error } = await supabase
      .from("contacts")
      .select()
      .order("name");

    if (error) throw error;
    return data as Contact[];
  },

  async searchContacts(query: string, userId: string) {
    const { data, error } = await supabase
      .from("contacts")
      .select()
      .eq("created_by", userId)
      .or(
        `name.ilike.%${query}%,whatsapp.ilike.%${query}%,description.ilike.%${query}%`
      )
      .order("name");

    if (error) throw error;
    return data as Contact[];
  },

  async getContactsByTags(tags: string[], userId: string) {
    const { data, error } = await supabase
      .from("contacts")
      .select()
      .eq("created_by", userId)
      .contains("tags", tags)
      .order("name");

    if (error) throw error;
    return data as Contact[];
  },
};

export interface Instance {
  id: string;
  instance_name: string;
  instance_id: string;
  is_default: boolean;
  status: "connected" | "disconnected" | "connecting";
  created_at: string;
  updated_at: string;
}

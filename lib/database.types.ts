// Generated from the bayit-title-website Supabase project (ref ajauxndpqllrsfivvurj)
// with `supabase gen types typescript`. Regenerate after any migration:
//   npx supabase gen types typescript --project-id ajauxndpqllrsfivvurj > lib/database.types.ts
// Only the Database type is kept; the generic Tables/TablesInsert helpers are unused here.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' };
  public: {
    Tables: {
      ai_audit_log: {
        Row: {
          assistant: string;
          bayit_cited: boolean;
          bayit_named: boolean;
          cited_url: string | null;
          competitors: string[] | null;
          created_at: string;
          id: string;
          notes: string | null;
          prompt: string;
          ran_on: string;
          raw_response: string | null;
        };
        Insert: {
          assistant: string;
          bayit_cited?: boolean;
          bayit_named?: boolean;
          cited_url?: string | null;
          competitors?: string[] | null;
          created_at?: string;
          id?: string;
          notes?: string | null;
          prompt: string;
          ran_on?: string;
          raw_response?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ai_audit_log']['Insert']>;
        Relationships: [];
      };
      google_reviews: {
        Row: {
          author_name: string;
          author_photo_url: string | null;
          body: string | null;
          body_truncated: boolean;
          county_slug: string | null;
          created_at: string;
          date_is_approximate: boolean;
          google_review_id: string;
          id: string;
          is_featured: boolean;
          is_hidden: boolean;
          published_at: string;
          rating: number;
          reply_at: string | null;
          reply_body: string | null;
          source: string;
          synced_at: string;
          team_member_slug: string | null;
          topic_tags: string[];
          updated_at_google: string | null;
        };
        Insert: {
          author_name: string;
          author_photo_url?: string | null;
          body?: string | null;
          body_truncated?: boolean;
          county_slug?: string | null;
          created_at?: string;
          date_is_approximate?: boolean;
          google_review_id: string;
          id?: string;
          is_featured?: boolean;
          is_hidden?: boolean;
          published_at: string;
          rating: number;
          reply_at?: string | null;
          reply_body?: string | null;
          source?: string;
          synced_at?: string;
          team_member_slug?: string | null;
          topic_tags?: string[];
          updated_at_google?: string | null;
        };
        Update: Partial<Database['public']['Tables']['google_reviews']['Insert']>;
        Relationships: [];
      };
      leads: {
        Row: {
          county_slug: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          heard_about_us: string | null;
          id: string;
          ip_hash: string | null;
          loan_amount: number | null;
          message: string | null;
          page_path: string | null;
          phone: string | null;
          property_address: string | null;
          purchase_price: number | null;
          role: string | null;
          source: Database['public']['Enums']['lead_source'];
          status: Database['public']['Enums']['lead_status'];
          transaction_type: string | null;
          updated_at: string;
          utm: Json | null;
        };
        Insert: {
          county_slug?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          heard_about_us?: string | null;
          id?: string;
          ip_hash?: string | null;
          loan_amount?: number | null;
          message?: string | null;
          page_path?: string | null;
          phone?: string | null;
          property_address?: string | null;
          purchase_price?: number | null;
          role?: string | null;
          source?: Database['public']['Enums']['lead_source'];
          status?: Database['public']['Enums']['lead_status'];
          transaction_type?: string | null;
          updated_at?: string;
          utm?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
        Relationships: [];
      };
      locations: {
        Row: {
          clerk_name: string | null;
          clerk_url: string | null;
          created_at: string;
          customary_owner_policy_payer: string | null;
          e_recording_available: boolean | null;
          id: string;
          is_priority: boolean;
          kind: Database['public']['Enums']['location_kind'];
          name: string;
          notes: string | null;
          parent_county_slug: string | null;
          property_appraiser_url: string | null;
          slug: string;
          tax_collector_url: string | null;
          updated_at: string;
        };
        Insert: {
          clerk_name?: string | null;
          clerk_url?: string | null;
          created_at?: string;
          customary_owner_policy_payer?: string | null;
          e_recording_available?: boolean | null;
          id?: string;
          is_priority?: boolean;
          kind: Database['public']['Enums']['location_kind'];
          name: string;
          notes?: string | null;
          parent_county_slug?: string | null;
          property_appraiser_url?: string | null;
          slug: string;
          tax_collector_url?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['locations']['Insert']>;
        Relationships: [];
      };
      order_documents: {
        Row: {
          id: string;
          mime_type: string | null;
          order_id: string;
          original_name: string;
          purge_after: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          mime_type?: string | null;
          order_id: string;
          original_name: string;
          purge_after?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_documents']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          buyer_name: string | null;
          closing_date_target: string | null;
          closing_method: string | null;
          county_slug: string | null;
          created_at: string;
          id: string;
          ip_hash: string | null;
          lender_contact: string | null;
          lender_name: string | null;
          loan_amount: number | null;
          notes: string | null;
          ordered_by_email: string;
          ordered_by_name: string;
          ordered_by_phone: string | null;
          ordered_by_role: string | null;
          page_path: string | null;
          parcel_id: string | null;
          property_address: string;
          purchase_price: number | null;
          reference: string | null;
          seller_name: string | null;
          status: Database['public']['Enums']['order_status'];
          transaction_type: string | null;
          updated_at: string;
        };
        Insert: {
          buyer_name?: string | null;
          closing_date_target?: string | null;
          closing_method?: string | null;
          county_slug?: string | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          lender_contact?: string | null;
          lender_name?: string | null;
          loan_amount?: number | null;
          notes?: string | null;
          ordered_by_email: string;
          ordered_by_name: string;
          ordered_by_phone?: string | null;
          ordered_by_role?: string | null;
          page_path?: string | null;
          parcel_id?: string | null;
          property_address: string;
          purchase_price?: number | null;
          reference?: string | null;
          seller_name?: string | null;
          status?: Database['public']['Enums']['order_status'];
          transaction_type?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      rate_tables: {
        Row: {
          county_slug: string | null;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          key: string;
          label: string;
          numeric_value: number | null;
          source_note: string | null;
          source_url: string;
          tier_max: number | null;
          tier_min: number | null;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          county_slug?: string | null;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          key: string;
          label: string;
          numeric_value?: number | null;
          source_note?: string | null;
          source_url: string;
          tier_max?: number | null;
          tier_min?: number | null;
          unit?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rate_tables']['Insert']>;
        Relationships: [];
      };
      review_requests: {
        Row: {
          channel: string;
          id: string;
          notes: string | null;
          order_id: string | null;
          recipient: string;
          responded: boolean;
          sent_at: string;
        };
        Insert: {
          channel?: string;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          recipient: string;
          responded?: boolean;
          sent_at?: string;
        };
        Update: Partial<Database['public']['Tables']['review_requests']['Insert']>;
        Relationships: [];
      };
      review_snapshot: {
        Row: { average_rating: number; id: boolean; review_count: number; synced_at: string };
        Insert: { average_rating: number; id?: boolean; review_count: number; synced_at?: string };
        Update: Partial<Database['public']['Tables']['review_snapshot']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      lead_source: 'quote' | 'contact' | 'partner' | 'calculator' | 'other';
      lead_status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost' | 'spam';
      location_kind: 'county' | 'city';
      order_status:
        | 'received'
        | 'opened'
        | 'search_ordered'
        | 'commitment_issued'
        | 'clearing'
        | 'clear_to_close'
        | 'scheduled'
        | 'closed'
        | 'cancelled';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

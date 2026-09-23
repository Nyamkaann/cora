export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      legacy_brands: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      legacy_categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      legacy_finance_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: number | null
          id: number
          note: string | null
          occurred_at: string
          type: Database["public"]["Enums"]["finance_type"]
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: number | null
          id?: number
          note?: string | null
          occurred_at: string
          type: Database["public"]["Enums"]["finance_type"]
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: number | null
          id?: number
          note?: string | null
          occurred_at?: string
          type?: Database["public"]["Enums"]["finance_type"]
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_created_by_users_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "legacy_users"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_product_images: {
        Row: {
          created_at: string
          created_by: number | null
          cutout_image_path: string | null
          error_message: string | null
          facebook_path: string | null
          id: number
          ig_portrait_path: string | null
          ig_square_path: string | null
          product_id: number
          source_image_path: string
          status: Database["public"]["Enums"]["product_image_status"]
        }
        Insert: {
          created_at?: string
          created_by?: number | null
          cutout_image_path?: string | null
          error_message?: string | null
          facebook_path?: string | null
          id?: number
          ig_portrait_path?: string | null
          ig_square_path?: string | null
          product_id: number
          source_image_path: string
          status?: Database["public"]["Enums"]["product_image_status"]
        }
        Update: {
          created_at?: string
          created_by?: number | null
          cutout_image_path?: string | null
          error_message?: string | null
          facebook_path?: string | null
          id?: number
          ig_portrait_path?: string | null
          ig_square_path?: string | null
          product_id?: number
          source_image_path?: string
          status?: Database["public"]["Enums"]["product_image_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_images_created_by_users_id_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "legacy_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "legacy_products"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_products: {
        Row: {
          brand_id: number | null
          category_id: number | null
          cost_price: number
          created_at: string
          id: number
          low_stock_threshold: number
          name: string
          sell_price: number
          sku: string | null
          stock_qty: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          brand_id?: number | null
          category_id?: number | null
          cost_price?: number
          created_at?: string
          id?: number
          low_stock_threshold?: number
          name: string
          sell_price?: number
          sku?: string | null
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: number | null
          category_id?: number | null
          cost_price?: number
          created_at?: string
          id?: number
          low_stock_threshold?: number
          name?: string
          sell_price?: number
          sku?: string | null
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_brands_id_fk"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "legacy_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_categories_id_fk"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "legacy_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_sales_log: {
        Row: {
          channel: Database["public"]["Enums"]["sales_channel"]
          created_at: string
          id: number
          product_id: number
          quantity: number
          sold_at: string
          sold_by: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          id?: number
          product_id: number
          quantity: number
          sold_at: string
          sold_by?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          channel?: Database["public"]["Enums"]["sales_channel"]
          created_at?: string
          id?: number
          product_id?: number
          quantity?: number
          sold_at?: string
          sold_by?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_log_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "legacy_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_log_sold_by_users_id_fk"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "legacy_users"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_social_posts: {
        Row: {
          created_at: string
          error_message: string | null
          external_post_id: string | null
          id: number
          platform: Database["public"]["Enums"]["social_platform"]
          posted_at: string | null
          product_image_id: number
          status: Database["public"]["Enums"]["social_post_status"]
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: number
          platform: Database["public"]["Enums"]["social_platform"]
          posted_at?: string | null
          product_image_id: number
          status: Database["public"]["Enums"]["social_post_status"]
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: number
          platform?: Database["public"]["Enums"]["social_platform"]
          posted_at?: string | null
          product_image_id?: number
          status?: Database["public"]["Enums"]["social_post_status"]
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_product_image_id_product_images_id_fk"
            columns: ["product_image_id"]
            isOneToOne: false
            referencedRelation: "legacy_product_images"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_users: {
        Row: {
          created_at: string
          email: string
          id: number
          is_active: boolean
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          is_active?: boolean
          name: string
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          is_active?: boolean
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_name_snapshot: string
          qty: number
          unit_cost: number
          unit_price: number
          updated_at: string
          variant_id: string
          variant_label_snapshot: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_name_snapshot: string
          qty: number
          unit_cost: number
          unit_price: number
          updated_at?: string
          variant_id: string
          variant_label_snapshot?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_name_snapshot?: string
          qty?: number
          unit_cost?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string
          variant_label_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_order_profit"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_variant_stock"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee: number
          discount_amount: number
          id: string
          note: string | null
          order_no: string | null
          ordered_at: string
          payment_status: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          discount_amount?: number
          id?: string
          note?: string | null
          order_no?: string | null
          ordered_at?: string
          payment_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          discount_amount?: number
          id?: string
          note?: string | null
          order_no?: string | null
          ordered_at?: string
          payment_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_results: {
        Row: {
          created_at: string
          error: string | null
          external_post_id: string | null
          id: string
          permalink: string | null
          platform: string
          published_at: string | null
          scheduled_post_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          external_post_id?: string | null
          id?: string
          permalink?: string | null
          platform: string
          published_at?: string | null
          scheduled_post_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          external_post_id?: string | null
          id?: string
          permalink?: string | null
          platform?: string
          published_at?: string | null
          scheduled_post_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_results_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poster_templates: {
        Row: {
          background_path: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          layout: Json
          name: string
          updated_at: string
        }
        Insert: {
          background_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout?: Json
          name: string
          updated_at?: string
        }
        Update: {
          background_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          is_transparent: boolean
          product_id: string
          sort_order: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          is_transparent?: boolean
          product_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          is_transparent?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          cost_price: number
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          product_id: string
          sale_price: number
          sku: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          attributes?: Json
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          sale_price?: number
          sku?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attributes?: Json
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          sale_price?: number
          sku?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_featured: boolean
          name: string
          option_types: string[]
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          name: string
          option_types?: string[]
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean
          name?: string
          option_types?: string[]
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          attempts: number
          caption: string | null
          created_at: string
          created_by: string | null
          hashtags: string[]
          id: string
          last_error: string | null
          platforms: string[]
          poster_path: string | null
          product_id: string
          scheduled_at: string | null
          status: string
          template_id: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          attempts?: number
          caption?: string | null
          created_at?: string
          created_by?: string | null
          hashtags?: string[]
          id?: string
          last_error?: string | null
          platforms?: string[]
          poster_path?: string | null
          product_id: string
          scheduled_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          attempts?: number
          caption?: string | null
          created_at?: string
          created_by?: string | null
          hashtags?: string[]
          id?: string
          last_error?: string | null
          platforms?: string[]
          poster_path?: string | null
          product_id?: string
          scheduled_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "scheduled_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "poster_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_variant_stock"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          access_token_encrypted: string
          connected_by: string | null
          created_at: string
          external_id: string
          id: string
          is_active: boolean
          name: string | null
          parent_page_id: string | null
          platform: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          connected_by?: string | null
          created_at?: string
          external_id: string
          id?: string
          is_active?: boolean
          name?: string | null
          parent_page_id?: string | null
          platform: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          connected_by?: string | null
          created_at?: string
          external_id?: string
          id?: string
          is_active?: boolean
          name?: string | null
          parent_page_id?: string | null
          platform?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_api_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          endpoint: string
          error: string | null
          id: string
          method: string
          platform: string
          request_summary: Json | null
          response_summary: Json | null
          scheduled_post_id: string | null
          status_code: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          error?: string | null
          id?: string
          method: string
          platform: string
          request_summary?: Json | null
          response_summary?: Json | null
          scheduled_post_id?: string | null
          status_code?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          error?: string | null
          id?: string
          method?: string
          platform?: string
          request_summary?: Json | null
          response_summary?: Json | null
          scheduled_post_id?: string | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_api_log_scheduled_post_id_fkey"
            columns: ["scheduled_post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          qty: number
          reason: string
          reference_id: string | null
          unit_cost: number | null
          updated_at: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          qty: number
          reason: string
          reference_id?: string | null
          unit_cost?: number | null
          updated_at?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          qty?: number
          reason?: string
          reference_id?: string | null
          unit_cost?: number | null
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "v_variant_stock"
            referencedColumns: ["variant_id"]
          },
        ]
      }
    }
    Views: {
      v_order_profit: {
        Row: {
          cost: number | null
          gross_profit: number | null
          margin_pct: number | null
          order_id: string | null
          revenue: number | null
        }
        Relationships: []
      }
      v_top_products: {
        Row: {
          cost: number | null
          gross_profit: number | null
          product_id: string | null
          product_name: string | null
          revenue: number | null
          units_sold: number | null
        }
        Relationships: []
      }
      v_variant_stock: {
        Row: {
          current_stock: number | null
          product_id: string | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_products"
            referencedColumns: ["product_id"]
          },
        ]
      }
    }
    Functions: {
      fn_claim_due_posts: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          caption: string | null
          created_at: string
          created_by: string | null
          hashtags: string[]
          id: string
          last_error: string | null
          platforms: string[]
          poster_path: string | null
          product_id: string
          scheduled_at: string | null
          status: string
          template_id: string | null
          updated_at: string
          variant_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_expenses_by_category: {
        Args: { p_from: string; p_to: string }
        Returns: {
          category: string
          entry_count: number
          total: number
        }[]
      }
      fn_expenses_by_category_month: {
        Args: { p_from: string; p_to: string }
        Returns: {
          category: string
          month: string
          total: number
        }[]
      }
      fn_low_stock: {
        Args: { p_threshold?: number }
        Returns: {
          current_stock: number
          product_name: string
          sku: string
          variant_id: string
          variant_label: string
        }[]
      }
      fn_profit_by_month: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cogs: number
          expenses: number
          gross_profit: number
          month: string
          net_profit: number
          order_count: number
          revenue: number
          unit_count: number
        }[]
      }
      fn_profit_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cogs: number
          expenses: number
          gross_profit: number
          net_profit: number
          order_count: number
          revenue: number
          unit_count: number
        }[]
      }
      fn_sales_by_channel: {
        Args: { p_from: string; p_to: string }
        Returns: {
          channel: string
          cogs: number
          gross_profit: number
          order_count: number
          revenue: number
        }[]
      }
      fn_sales_series: {
        Args: { p_bucket?: string; p_from: string; p_to: string }
        Returns: {
          bucket: string
          cogs: number
          gross_profit: number
          order_count: number
          revenue: number
          unit_count: number
        }[]
      }
      fn_set_order_status: {
        Args: { p_order_id: string; p_status: string; p_user_id?: string }
        Returns: string
      }
      fn_top_products: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          cogs: number
          gross_profit: number
          margin_pct: number
          product_id: string
          product_name: string
          revenue: number
          units_sold: number
        }[]
      }
      fn_variant_report: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cogs: number
          gross_profit: number
          margin_pct: number
          product_name: string
          revenue: number
          sku: string
          units_sold: number
          variant_id: string
          variant_label: string
        }[]
      }
    }
    Enums: {
      finance_type: "income" | "expense"
      product_image_status: "processing" | "ready" | "failed"
      sales_channel: "in_store" | "social"
      social_platform: "facebook" | "instagram"
      social_post_status: "posted" | "failed" | "skipped"
      user_role: "admin" | "warehouse" | "sales"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      finance_type: ["income", "expense"],
      product_image_status: ["processing", "ready", "failed"],
      sales_channel: ["in_store", "social"],
      social_platform: ["facebook", "instagram"],
      social_post_status: ["posted", "failed", "skipped"],
      user_role: ["admin", "warehouse", "sales"],
    },
  },
} as const

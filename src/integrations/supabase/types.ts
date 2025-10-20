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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          attendance_date: string
          check_in_location: string | null
          check_in_time: string | null
          check_out_location: string | null
          check_out_time: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          check_in_location?: string | null
          check_in_time?: string | null
          check_out_location?: string | null
          check_out_time?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          check_in_location?: string | null
          check_in_time?: string | null
          check_out_location?: string | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_name: string | null
          name_ar: string
          name_en: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name_ar: string
          name_en: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_name?: string | null
          name_ar?: string
          name_en?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          balance: number
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name_ar: string
          name_en: string
          organization_id: string | null
          parent_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          balance?: number
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name_ar: string
          name_en: string
          organization_id?: string | null
          parent_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          balance?: number
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name_ar?: string
          name_en?: string
          organization_id?: string | null
          parent_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          commercial_registration: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          phone: string | null
          tax_number: string | null
          total_balance: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          phone?: string | null
          tax_number?: string | null
          total_balance?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          tax_number?: string | null
          total_balance?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_driver_commissions: {
        Row: {
          amount: number
          commission_type: Database["public"]["Enums"]["driver_commission_type"]
          company_id: string
          created_at: string | null
          id: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          commission_type: Database["public"]["Enums"]["driver_commission_type"]
          company_id: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          commission_type?: Database["public"]["Enums"]["driver_commission_type"]
          company_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_driver_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_driver_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_load_type_prices: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          load_type_id: string
          organization_id: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          load_type_id: string
          organization_id?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          load_type_id?: string
          organization_id?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_load_type_prices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_load_type_prices_load_type_id_fkey"
            columns: ["load_type_id"]
            isOneToOne: false
            referencedRelation: "load_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_load_type_prices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          commercial_registration: string | null
          company_name: string
          created_at: string | null
          id: string
          organization_id: string | null
          phone: string | null
          supplier_name: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commercial_registration?: string | null
          company_name?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          supplier_name?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commercial_registration?: string | null
          company_name?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          supplier_name?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar: string
          name_en: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_expenses: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          organization_id: string | null
          representative_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date: string
          expense_type: string
          id?: string
          organization_id?: string | null
          representative_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          organization_id?: string | null
          representative_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_expenses_expense_type_fkey"
            columns: ["expense_type"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custody_expenses_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_journal_entries: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          entry_date: string
          from_account: string
          id: string
          to_account: string
          transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          entry_date: string
          from_account: string
          id?: string
          to_account: string
          transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          entry_date?: string
          from_account?: string
          id?: string
          to_account?: string
          transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_journal_entries_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "custody_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_representatives: {
        Row: {
          created_at: string | null
          current_custody: number | null
          id: string
          name: string
          organization_id: string | null
          remaining_custody: number | null
          total_custody: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_custody?: number | null
          id?: string
          name: string
          organization_id?: string | null
          remaining_custody?: number | null
          total_custody?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_custody?: number | null
          id?: string
          name?: string
          organization_id?: string | null
          remaining_custody?: number | null
          total_custody?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_representatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custody_transfers: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_type: string | null
          id: string
          organization_id: string | null
          recipient_name: string
          transfer_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_type?: string | null
          id?: string
          organization_id?: string | null
          recipient_name: string
          transfer_date: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_type?: string | null
          id?: string
          organization_id?: string | null
          recipient_name?: string
          transfer_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custody_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_receipts: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          driver_id: string | null
          driver_signature: string | null
          empty_weight: number | null
          entry_time: string | null
          exit_time: string | null
          full_weight: number | null
          id: string
          material_type: string | null
          net_weight: number | null
          organization_id: string | null
          receipt_number: string
          receiver_signature: string | null
          supervisor_signature: string | null
          supplier_company: string | null
          truck_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          driver_id?: string | null
          driver_signature?: string | null
          empty_weight?: number | null
          entry_time?: string | null
          exit_time?: string | null
          full_weight?: number | null
          id?: string
          material_type?: string | null
          net_weight?: number | null
          organization_id?: string | null
          receipt_number: string
          receiver_signature?: string | null
          supervisor_signature?: string | null
          supplier_company?: string | null
          truck_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          driver_id?: string | null
          driver_signature?: string | null
          empty_weight?: number | null
          entry_time?: string | null
          exit_time?: string | null
          full_weight?: number | null
          id?: string
          material_type?: string | null
          net_weight?: number | null
          organization_id?: string | null
          receipt_number?: string
          receiver_signature?: string | null
          supervisor_signature?: string | null
          supplier_company?: string | null
          truck_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_receipts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_system_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          password_hash: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          password_hash: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          password_hash?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      driver_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          driver_id: string
          id: string
          notes: string | null
          organization_id: string | null
          payment_date: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          driver_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          driver_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_transfer_receipts: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          driver_id: string
          id: string
          organization_id: string | null
          receipt_number: string
          transfer_date: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          driver_id: string
          id?: string
          organization_id?: string | null
          receipt_number: string
          transfer_date?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          driver_id?: string
          id?: string
          organization_id?: string | null
          receipt_number?: string
          transfer_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_transfer_receipts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          employee_id: string
          id: string
          organization_id: string | null
          remaining_balance: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          employee_id: string
          id?: string
          organization_id?: string | null
          remaining_balance?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          employee_id?: string
          id?: string
          organization_id?: string | null
          remaining_balance?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          hire_date: string
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          position: string
          salary: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          hire_date: string
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          position: string
          salary: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          hire_date?: string
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          position?: string
          salary?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_supplier: string
          date: string
          discount_amount: number | null
          id: string
          invoice_number: string
          net_amount: number
          notes: string | null
          organization_id: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_supplier: string
          date: string
          discount_amount?: number | null
          id?: string
          invoice_number: string
          net_amount: number
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount: number
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_supplier?: string
          date?: string
          discount_amount?: number | null
          id?: string
          invoice_number?: string
          net_amount?: number
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          entry_number: string
          id: string
          organization_id: string | null
          reference: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          entry_number: string
          id?: string
          organization_id?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          entry_number?: string
          id?: string
          organization_id?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          cost_center_id: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_entry_id: string
          project_id: string | null
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
          project_id?: string | null
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          approved_by: string | null
          created_at: string | null
          employee_id: string
          end_date: string
          id: string
          organization_id: string | null
          reason: string | null
          start_date: string
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          end_date: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          start_date: string
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          start_date?: string
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      load_invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          load_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          load_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          load_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "load_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "load_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "load_invoice_items_load_id_fkey"
            columns: ["load_id"]
            isOneToOne: false
            referencedRelation: "loads"
            referencedColumns: ["id"]
          },
        ]
      }
      load_invoices: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string | null
          payment_type: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id?: string | null
          payment_type?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string | null
          payment_type?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "load_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "load_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      load_types: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loads: {
        Row: {
          commission_amount: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          driver_id: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          load_number: string
          load_type_id: string | null
          notes: string | null
          organization_id: string | null
          quantity: number | null
          status: string | null
          total_amount: number | null
          truck_number: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          driver_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          load_number: string
          load_type_id?: string | null
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          status?: string | null
          total_amount?: number | null
          truck_number?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          driver_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          load_number?: string
          load_type_id?: string | null
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          status?: string | null
          total_amount?: number | null
          truck_number?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loads_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loads_load_type_id_fkey"
            columns: ["load_type_id"]
            isOneToOne: false
            referencedRelation: "load_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string | null
          description: string
          id: string
          organization_id: string | null
          priority: string | null
          requested_by: string | null
          status: string | null
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description: string
          id?: string
          organization_id?: string | null
          priority?: string | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string
          id?: string
          organization_id?: string | null
          priority?: string | null
          requested_by?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_records: {
        Row: {
          created_at: string | null
          date: string
          id: string
          mileage: number
          notes: string | null
          organization_id: string | null
          recorded_by: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          mileage: number
          notes?: string | null
          organization_id?: string | null
          recorded_by?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          mileage?: number
          notes?: string | null
          organization_id?: string | null
          recorded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      oil_change_records: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string
          id: string
          mileage: number
          notes: string | null
          organization_id: string | null
          performed_by: string | null
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date: string
          id?: string
          mileage: number
          notes?: string | null
          organization_id?: string | null
          performed_by?: string | null
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date?: string
          id?: string
          mileage?: number
          notes?: string | null
          organization_id?: string | null
          performed_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oil_change_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oil_change_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          commercial_registration: string | null
          created_at: string | null
          database_initialized: boolean | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string | null
          database_initialized?: boolean | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string | null
          database_initialized?: boolean | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_receipts: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          organization_id: string | null
          receipt_number: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          receipt_number: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          receipt_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_vouchers: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          credit_account_id: string
          debit_account_id: string
          description: string | null
          id: string
          organization_id: string | null
          updated_at: string | null
          voucher_date: string
          voucher_number: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          credit_account_id: string
          debit_account_id: string
          description?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          voucher_date: string
          voucher_number: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string
          debit_account_id?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string | null
          voucher_date?: string
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_vouchers_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          code: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string
          organization_id: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name_ar: string
          name_en: string
          organization_id?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          organization_id?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          credit_account_id: string
          debit_account_id: string
          description: string
          id: string
          order_date: string
          order_number: string
          organization_id: string | null
          supplier_name: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          credit_account_id: string
          debit_account_id: string
          description: string
          id?: string
          order_date: string
          order_number: string
          organization_id?: string | null
          supplier_name: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string
          debit_account_id?: string
          description?: string
          id?: string
          order_date?: string
          order_number?: string
          organization_id?: string | null
          supplier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spare_parts: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          min_quantity: number | null
          name: string
          organization_id: string | null
          quantity: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          min_quantity?: number | null
          name: string
          organization_id?: string | null
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          min_quantity?: number | null
          name?: string
          organization_id?: string | null
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_parts_purchases: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          invoice_number: string | null
          organization_id: string | null
          purchase_date: string
          quantity: number
          spare_part_id: string
          supplier: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          organization_id?: string | null
          purchase_date: string
          quantity: number
          spare_part_id: string
          supplier?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_number?: string | null
          organization_id?: string | null
          purchase_date?: string
          quantity?: number
          spare_part_id?: string
          supplier?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_parts_purchases_spare_part_id_fkey"
            columns: ["spare_part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          spare_part_id: string
          transaction_date: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          spare_part_id: string
          transaction_date: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          spare_part_id?: string
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_spare_part_id_fkey"
            columns: ["spare_part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          commercial_registration: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          organization_id: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          organization_id?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commercial_registration?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          organization_id?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          current_mileage: number | null
          driver_name: string | null
          id: string
          last_oil_change_date: string | null
          last_oil_change_mileage: number | null
          license_plate: string
          model: string
          notes: string | null
          organization_id: string | null
          status: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          current_mileage?: number | null
          driver_name?: string | null
          id?: string
          last_oil_change_date?: string | null
          last_oil_change_mileage?: number | null
          license_plate: string
          model: string
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          current_mileage?: number | null
          driver_name?: string | null
          id?: string
          last_oil_change_date?: string | null
          last_oil_change_mileage?: number | null
          license_plate?: string
          model?: string
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_account_level: {
        Args: { account_id: string }
        Returns: number
      }
      create_journal_entry_with_number: {
        Args: { p_date: string; p_description: string }
        Returns: {
          created_at: string
          date: string
          description: string
          entry_number: string
          id: string
        }[]
      }
      get_user_organization: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_organization_chart_of_accounts: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      verify_delivery_system_user: {
        Args: { p_password: string; p_username: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee" | "accountant"
      driver_commission_type:
        | "fixed"
        | "weight_less_40"
        | "weight_40_44"
        | "weight_44_49"
        | "weight_more_49"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "employee", "accountant"],
      driver_commission_type: [
        "fixed",
        "weight_less_40",
        "weight_40_44",
        "weight_44_49",
        "weight_more_49",
      ],
    },
  },
} as const

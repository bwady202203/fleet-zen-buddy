import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type VehicleStatus = "active" | "maintenance" | "warning" | "out-of-service";

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  status: VehicleStatus;
  lastService: string;
  nextService: string;
  mileage: number;
}

interface VehiclesContextType {
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<void>;
  updateVehicleStatus: (id: string, status: VehicleStatus) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  refreshVehicles: () => Promise<void>;
}

const VehiclesContext = createContext<VehiclesContextType | undefined>(undefined);

export const VehiclesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadVehicles();
    
    // إعداد realtime subscription للاستماع للتغييرات
    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        () => {
          loadVehicles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data) {
        const mappedVehicles: Vehicle[] = data.map(v => ({
          id: v.id,
          name: `${v.model} - ${v.license_plate}`,
          type: v.model,
          status: v.status as VehicleStatus || 'active',
          lastService: v.last_oil_change_date || '',
          nextService: '',
          mileage: v.current_mileage || 0,
        }));
        setVehicles(mappedVehicles);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          license_plate: vehicle.name.split(' - ')[1] || vehicle.name,
          model: vehicle.type,
          year: new Date().getFullYear(),
          status: vehicle.status,
          current_mileage: vehicle.mileage || 0,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newVehicle: Vehicle = {
          id: data.id,
          name: `${data.model} - ${data.license_plate}`,
          type: data.model,
          status: data.status as VehicleStatus || 'active',
          lastService: data.last_oil_change_date || '',
          nextService: '',
          mileage: data.current_mileage || 0,
        };
        setVehicles(prev => [...prev, newVehicle]);
        
        toast({
          title: 'تم الإضافة / Added',
          description: 'تم إضافة المركبة بنجاح / Vehicle added successfully',
        });
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل إضافة المركبة / Failed to add vehicle',
        variant: 'destructive',
      });
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    try {
      const dbUpdates: any = {};
      if (updates.type) dbUpdates.model = updates.type;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.mileage !== undefined) dbUpdates.current_mileage = updates.mileage;

      const { error } = await supabase
        .from('vehicles')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === id ? { ...vehicle, ...updates } : vehicle
      ));
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل تحديث المركبة / Failed to update vehicle',
        variant: 'destructive',
      });
    }
  };

  const updateVehicleStatus = async (id: string, status: VehicleStatus) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === id ? { ...vehicle, status } : vehicle
      ));
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل تحديث حالة المركبة / Failed to update vehicle status',
        variant: 'destructive',
      });
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVehicles(prev => prev.filter(vehicle => vehicle.id !== id));
      
      toast({
        title: 'تم الحذف / Deleted',
        description: 'تم حذف المركبة بنجاح / Vehicle deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل حذف المركبة / Failed to delete vehicle',
        variant: 'destructive',
      });
    }
  };

  return (
    <VehiclesContext.Provider value={{ vehicles, addVehicle, updateVehicle, updateVehicleStatus, deleteVehicle, refreshVehicles: loadVehicles }}>
      {children}
    </VehiclesContext.Provider>
  );
};

export const useVehicles = () => {
  const context = useContext(VehiclesContext);
  if (!context) {
    throw new Error('useVehicles must be used within VehiclesProvider');
  }
  return context;
};

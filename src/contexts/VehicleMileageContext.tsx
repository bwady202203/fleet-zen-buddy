import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MileageRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  date: string;
  mileage: number;
  driverName: string;
  notes?: string;
  type?: 'regular' | 'oil-change';
  resetMileage?: boolean;
}

export interface OilChangeRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  date: string;
  mileageAtChange: number;
  nextOilChange: number;
  oilType: string;
  cost: number;
  notes?: string;
  resetMileage: boolean;
}

interface VehicleMileageContextType {
  mileageRecords: MileageRecord[];
  oilChangeRecords: OilChangeRecord[];
  addMileageRecord: (record: Omit<MileageRecord, 'id'>) => Promise<void>;
  addOilChangeRecord: (record: Omit<OilChangeRecord, 'id'>) => Promise<void>;
  getMileageByVehicle: (vehicleId: string) => MileageRecord[];
  getOilChangesByVehicle: (vehicleId: string) => OilChangeRecord[];
  getLastOilChange: (vehicleId: string) => OilChangeRecord | undefined;
}

const VehicleMileageContext = createContext<VehicleMileageContextType | undefined>(undefined);

export const VehicleMileageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mileageRecords, setMileageRecords] = useState<MileageRecord[]>([]);
  const [oilChangeRecords, setOilChangeRecords] = useState<OilChangeRecord[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMileageRecords();
    loadOilChangeRecords();
  }, []);

  const loadMileageRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('mileage_records')
        .select('*, vehicles(model, license_plate)')
        .order('date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const mapped: MileageRecord[] = data.map(r => ({
          id: r.id,
          vehicleId: r.vehicle_id,
          vehicleName: r.vehicles ? `${r.vehicles.model} - ${r.vehicles.license_plate}` : '',
          date: r.date,
          mileage: r.mileage,
          driverName: r.notes || '',
          notes: r.notes,
          type: 'regular',
        }));
        setMileageRecords(mapped);
      }
    } catch (error) {
      console.error('Error loading mileage records:', error);
    }
  };

  const loadOilChangeRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('oil_change_records')
        .select('*, vehicles(model, license_plate)')
        .order('date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const mapped: OilChangeRecord[] = data.map(r => ({
          id: r.id,
          vehicleId: r.vehicle_id,
          vehicleName: r.vehicles ? `${r.vehicles.model} - ${r.vehicles.license_plate}` : '',
          vehicleType: r.vehicles?.model || '',
          date: r.date,
          mileageAtChange: r.mileage,
          nextOilChange: r.mileage + 5000,
          oilType: r.performed_by || '',
          cost: Number(r.cost) || 0,
          notes: r.notes,
          resetMileage: true,
        }));
        setOilChangeRecords(mapped);
      }
    } catch (error) {
      console.error('Error loading oil change records:', error);
    }
  };

  const addMileageRecord = async (record: Omit<MileageRecord, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('mileage_records')
        .insert({
          vehicle_id: record.vehicleId,
          date: record.date,
          mileage: record.mileage,
          notes: record.notes || record.driverName,
        })
        .select()
        .single();

      if (error) throw error;

      const newRecord: MileageRecord = {
        id: data.id,
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
        date: record.date,
        mileage: record.mileage,
        driverName: record.driverName,
        notes: record.notes,
        type: record.type || 'regular',
      };
      setMileageRecords(prev => [...prev, newRecord]);
      
      toast({
        title: 'تم التسجيل / Recorded',
        description: 'تم تسجيل الكيلومترات بنجاح / Mileage recorded successfully',
      });
    } catch (error) {
      console.error('Error adding mileage record:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل تسجيل الكيلومترات / Failed to record mileage',
        variant: 'destructive',
      });
    }
  };

  const addOilChangeRecord = async (record: Omit<OilChangeRecord, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('oil_change_records')
        .insert({
          vehicle_id: record.vehicleId,
          date: record.date,
          mileage: record.mileageAtChange,
          cost: record.cost,
          performed_by: record.oilType,
          notes: record.notes,
        })
        .select()
        .single();

      if (error) throw error;

      const newRecord: OilChangeRecord = {
        id: data.id,
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
        vehicleType: record.vehicleType,
        date: record.date,
        mileageAtChange: record.mileageAtChange,
        nextOilChange: record.nextOilChange,
        oilType: record.oilType,
        cost: record.cost,
        notes: record.notes,
        resetMileage: record.resetMileage,
      };
      setOilChangeRecords(prev => [...prev, newRecord]);

      // تحديث تاريخ آخر تغيير زيت في المركبة
      await supabase
        .from('vehicles')
        .update({
          last_oil_change_date: record.date,
          last_oil_change_mileage: record.mileageAtChange,
        })
        .eq('id', record.vehicleId);

      // إضافة سجل كيلومترات لتغيير الزيت إذا كان هناك تصفير
      if (record.resetMileage) {
        await addMileageRecord({
          vehicleId: record.vehicleId,
          vehicleName: record.vehicleName,
          date: record.date,
          mileage: 0,
          driverName: 'النظام',
          notes: 'تم تصفير العداد - تغيير زيت',
          type: 'oil-change',
          resetMileage: true,
        });
      }
      
      toast({
        title: 'تم التسجيل / Recorded',
        description: 'تم تسجيل تغيير الزيت بنجاح / Oil change recorded successfully',
      });
    } catch (error) {
      console.error('Error adding oil change record:', error);
      toast({
        title: 'خطأ / Error',
        description: 'فشل تسجيل تغيير الزيت / Failed to record oil change',
        variant: 'destructive',
      });
    }
  };

  const getMileageByVehicle = (vehicleId: string) => {
    return mileageRecords.filter(record => record.vehicleId === vehicleId);
  };

  const getOilChangesByVehicle = (vehicleId: string) => {
    return oilChangeRecords.filter(record => record.vehicleId === vehicleId);
  };

  const getLastOilChange = (vehicleId: string) => {
    const changes = oilChangeRecords
      .filter(record => record.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return changes[0];
  };

  return (
    <VehicleMileageContext.Provider value={{ 
      mileageRecords, 
      oilChangeRecords,
      addMileageRecord, 
      addOilChangeRecord,
      getMileageByVehicle,
      getOilChangesByVehicle,
      getLastOilChange,
    }}>
      {children}
    </VehicleMileageContext.Provider>
  );
};

export const useVehicleMileage = () => {
  const context = useContext(VehicleMileageContext);
  if (!context) {
    throw new Error('useVehicleMileage must be used within VehicleMileageProvider');
  }
  return context;
};

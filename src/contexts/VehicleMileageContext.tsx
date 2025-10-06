import React, { createContext, useContext, useState, useEffect } from 'react';

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
  addMileageRecord: (record: Omit<MileageRecord, 'id'>) => void;
  addOilChangeRecord: (record: Omit<OilChangeRecord, 'id'>) => void;
  getMileageByVehicle: (vehicleId: string) => MileageRecord[];
  getOilChangesByVehicle: (vehicleId: string) => OilChangeRecord[];
  getLastOilChange: (vehicleId: string) => OilChangeRecord | undefined;
}

const VehicleMileageContext = createContext<VehicleMileageContextType | undefined>(undefined);

export const VehicleMileageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mileageRecords, setMileageRecords] = useState<MileageRecord[]>(() => {
    const saved = localStorage.getItem('mileageRecords');
    return saved ? JSON.parse(saved) : [];
  });

  const [oilChangeRecords, setOilChangeRecords] = useState<OilChangeRecord[]>(() => {
    const saved = localStorage.getItem('oilChangeRecords');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mileageRecords', JSON.stringify(mileageRecords));
  }, [mileageRecords]);

  useEffect(() => {
    localStorage.setItem('oilChangeRecords', JSON.stringify(oilChangeRecords));
  }, [oilChangeRecords]);

  const addMileageRecord = (record: Omit<MileageRecord, 'id'>) => {
    const newRecord: MileageRecord = {
      ...record,
      id: Date.now().toString(),
      type: record.type || 'regular',
    };
    setMileageRecords(prev => [...prev, newRecord]);
  };

  const addOilChangeRecord = (record: Omit<OilChangeRecord, 'id'>) => {
    console.log('Adding oil change record:', record);
    
    const newRecord: OilChangeRecord = {
      ...record,
      id: Date.now().toString(),
    };
    
    console.log('New oil change record:', newRecord);
    setOilChangeRecords(prev => {
      const updated = [...prev, newRecord];
      console.log('Updated oil change records:', updated);
      return updated;
    });

    // إضافة سجل كيلومترات لتغيير الزيت
    if (record.resetMileage) {
      const mileageRecord: MileageRecord = {
        id: `${Date.now()}-mileage`,
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
        date: record.date,
        mileage: 0,
        driverName: 'النظام',
        notes: `تم تصفير العداد - تغيير زيت`,
        type: 'oil-change',
        resetMileage: true,
      };
      console.log('Adding reset mileage record:', mileageRecord);
      setMileageRecords(prev => [...prev, mileageRecord]);
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

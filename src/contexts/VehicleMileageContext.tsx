import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MileageRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  date: string;
  mileage: number;
  driverName: string;
  notes?: string;
}

interface VehicleMileageContextType {
  mileageRecords: MileageRecord[];
  addMileageRecord: (record: Omit<MileageRecord, 'id'>) => void;
  getMileageByVehicle: (vehicleId: string) => MileageRecord[];
}

const VehicleMileageContext = createContext<VehicleMileageContextType | undefined>(undefined);

export const VehicleMileageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mileageRecords, setMileageRecords] = useState<MileageRecord[]>(() => {
    const saved = localStorage.getItem('mileageRecords');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mileageRecords', JSON.stringify(mileageRecords));
  }, [mileageRecords]);

  const addMileageRecord = (record: Omit<MileageRecord, 'id'>) => {
    const newRecord: MileageRecord = {
      ...record,
      id: Date.now().toString(),
    };
    setMileageRecords(prev => [...prev, newRecord]);
  };

  const getMileageByVehicle = (vehicleId: string) => {
    return mileageRecords.filter(record => record.vehicleId === vehicleId);
  };

  return (
    <VehicleMileageContext.Provider value={{ mileageRecords, addMileageRecord, getMileageByVehicle }}>
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

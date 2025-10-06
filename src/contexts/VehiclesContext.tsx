import React, { createContext, useContext, useState, useEffect } from 'react';

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
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  updateVehicleStatus: (id: string, status: VehicleStatus) => void;
  deleteVehicle: (id: string) => void;
}

const VehiclesContext = createContext<VehiclesContextType | undefined>(undefined);

const initialVehicles: Vehicle[] = [
  {
    id: "1",
    name: "شاحنة A-101",
    type: "شاحنة ثقيلة",
    status: "active",
    lastService: "2024-09-15",
    nextService: "2024-12-15",
    mileage: 0
  },
  {
    id: "2",
    name: "فان B-205",
    type: "فان توصيل",
    status: "warning",
    lastService: "2024-08-20",
    nextService: "2024-11-20",
    mileage: 0
  },
  {
    id: "3",
    name: "شاحنة C-340",
    type: "شاحنة متوسطة",
    status: "maintenance",
    lastService: "2024-10-01",
    nextService: "2024-10-15",
    mileage: 0
  },
  {
    id: "4",
    name: "فان D-412",
    type: "فان نقل",
    status: "active",
    lastService: "2024-09-10",
    nextService: "2024-12-10",
    mileage: 0
  }
];

export const VehiclesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('vehicles');
    return saved ? JSON.parse(saved) : initialVehicles;
  });

  useEffect(() => {
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  const addVehicle = (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: Date.now().toString(),
    };
    setVehicles(prev => [...prev, newVehicle]);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(vehicle => 
      vehicle.id === id ? { ...vehicle, ...updates } : vehicle
    ));
  };

  const updateVehicleStatus = (id: string, status: VehicleStatus) => {
    setVehicles(prev => prev.map(vehicle => 
      vehicle.id === id ? { ...vehicle, status } : vehicle
    ));
  };

  const deleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(vehicle => vehicle.id !== id));
  };

  return (
    <VehiclesContext.Provider value={{ vehicles, addVehicle, updateVehicle, updateVehicleStatus, deleteVehicle }}>
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

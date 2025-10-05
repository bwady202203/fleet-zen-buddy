import { VehicleCard } from "@/components/VehicleCard";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Calendar, Wrench, AlertCircle, Plus, Search } from "lucide-react";

const Index = () => {
  const vehicles = [
    {
      id: "1",
      name: "Truck A-101",
      type: "Heavy Truck",
      status: "active" as const,
      lastService: "2024-09-15",
      nextService: "2024-12-15",
      mileage: 45230
    },
    {
      id: "2",
      name: "Van B-205",
      type: "Delivery Van",
      status: "warning" as const,
      lastService: "2024-08-20",
      nextService: "2024-11-20",
      mileage: 32100
    },
    {
      id: "3",
      name: "Truck C-340",
      type: "Medium Truck",
      status: "maintenance" as const,
      lastService: "2024-10-01",
      nextService: "2024-10-15",
      mileage: 58920
    },
    {
      id: "4",
      name: "Van D-412",
      type: "Cargo Van",
      status: "active" as const,
      lastService: "2024-09-10",
      nextService: "2024-12-10",
      mileage: 28450
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <Truck className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Fleet Maintenance Tracker</h1>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Fleet Overview</h2>
          <p className="text-muted-foreground mb-6">Monitor and manage your fleet maintenance schedule</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Vehicles"
              value={vehicles.length}
              icon={Truck}
              description="Active fleet size"
            />
            <StatsCard
              title="Active"
              value={vehicles.filter(v => v.status === "active").length}
              icon={Calendar}
              description="Vehicles in operation"
            />
            <StatsCard
              title="In Maintenance"
              value={vehicles.filter(v => v.status === "maintenance").length}
              icon={Wrench}
              description="Currently being serviced"
            />
            <StatsCard
              title="Service Due"
              value={vehicles.filter(v => v.status === "warning").length}
              icon={AlertCircle}
              description="Requires attention"
            />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Fleet</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search vehicles..." 
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} {...vehicle} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;

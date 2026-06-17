import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  Users,
  Wifi,
  Zap,
  Car,
  Utensils,
  Maximize,
  DollarSign,
  Plus,
  Calendar,
  MessageSquare,
  ChevronRight,
  Shield,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/useWebSocket";

const VenuesPage = () => {
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    latitude: 0,
    longitude: 0,
    capacity: 0,
    daily_rate: 0,
    amenities: "",
  });

  const fetchVenues = async () => {
    try {
      const res = await api.get("/venue/venues");
      setVenues(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [bookingOpen, setBookingOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [myTournaments, setMyTournaments] = useState([]);

  const todayStr = new Date().toISOString().split("T")[0];

  const wsMessage = useWebSocket(selectedBooking?.id);

  useEffect(() => {
    if (wsMessage?.type === "VENUE_CHAT") {
      setChatMessages((prev) => [...prev, wsMessage.data]);
    }
  }, [wsMessage]);

  const fetchChat = async (bid) => {
    try {
      const res = await api.get(`/venue/bookings/${bid}/chat`);
      setChatMessages(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await api.post(`/venue/bookings/${selectedBooking.id}/chat`, {
        content: newMessage,
      });
      setNewMessage("");
    } catch (err) {
      alert("Transmission failed");
    }
  };

  const [bookingData, setBookingData] = useState({
    tournament_id: "",
    start_date: "",
    end_date: "",
  });

  const fetchMyTournaments = async () => {
    try {
      const res = await api.get("/tournaments?filter=mine");
      setMyTournaments(res.data || []);
      if (res.data?.length > 0) {
        setBookingData((prev) => ({ ...prev, tournament_id: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const res = await api.get("/venue/bookings/my");
      setMyBookings(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVenues();
    fetchMyTournaments();
    fetchMyBookings();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/venue/bookings/${id}`, { status });
      fetchMyBookings();
      fetchVenues();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/venue/venues", {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        capacity: parseInt(formData.capacity),
        daily_rate: parseFloat(formData.daily_rate),
      });
      setOpen(false);
      fetchVenues();
      setFormData({
        name: "",
        description: "",
        address: "",
        latitude: 0,
        longitude: 0,
        capacity: 0,
        daily_rate: 0,
        amenities: "",
      });
    } catch (err) {
      alert("Failed to enlist arena");
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    const start = new Date(bookingData.start_date);
    const end = new Date(bookingData.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      alert("Deployment start date cannot be in the past.");
      return;
    }
    if (end < start) {
      alert("Deployment end date must be on or after the start date.");
      return;
    }

    try {
      await api.post(`/venue/venues/${selectedVenue.id}/book`, {
        tournament_id: bookingData.tournament_id,
        start_date: new Date(bookingData.start_date).toISOString(),
        end_date: new Date(bookingData.end_date).toISOString(),
      });
      setBookingOpen(false);
      alert(
        "Operational deployment request transmitted. Awaiting owner authorization.",
      );
    } catch (err) {
      alert(err.response?.data?.error || "Deployment request failed");
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
              Operational Sites
            </span>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">
            Venues
          </h1>
        </div>

        <div className="flex flex-wrap gap-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="px-8 font-black uppercase tracking-widest text-[10px] h-12">
                List Your Arena
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-0 rounded-none p-10">
              <DialogHeader className="space-y-6">
                <DialogTitle className="text-3xl font-bold uppercase tracking-tighter">
                  New Site Deployment
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  Register your physical site to the arena network for
                  tournament hosting.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-8 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3 col-span-full">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      Site Name
                    </Label>
                    <Input
                      placeholder="E.G. APEX ARENA CENTER"
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-3 col-span-full">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      Description
                    </Label>
                    <Input
                      placeholder="SITE CAPABILITIES AND SPECIFICATIONS..."
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-3 col-span-full">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      Physical Address
                    </Label>
                    <Input
                      placeholder="SECTOR, BLOCK, COORDINATES..."
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      Max Occupancy
                    </Label>
                    <Input
                      type="number"
                      placeholder="CAPACITY"
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      Daily Rate (Credits)
                    </Label>
                    <Input
                      type="number"
                      placeholder="PRICE"
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                      value={formData.daily_rate}
                      onChange={(e) =>
                        setFormData({ ...formData, daily_rate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-3 col-span-full">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      Amenities
                    </Label>
                    <Input
                      placeholder="E.G. WIFI, POWER, PARKING..."
                      className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                      value={formData.amenities}
                      onChange={(e) =>
                        setFormData({ ...formData, amenities: e.target.value })
                      }
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full font-black uppercase tracking-widest text-[10px] h-14"
                >
                  Enlist Site
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex border-b">
        <button
          className={cn(
            "px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
            activeTab === "browse"
              ? "border-b-2 border-primary"
              : "opacity-30 hover:opacity-100",
          )}
          onClick={() => setActiveTab("browse")}
        >
          All Sites
        </button>
        <button
          className={cn(
            "px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all",
            activeTab === "logs"
              ? "border-b-2 border-primary"
              : "opacity-30 hover:opacity-100",
          )}
          onClick={() => setActiveTab("logs")}
        >
          Operational Logs
        </button>
      </div>

      {activeTab === "browse" ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l animate-pulse opacity-20">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 border-r border-b bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l">
            {venues.map((v, i) => (
              <div
                key={v.id}
                className="p-10 border-r border-b hover:bg-accent/30 transition-colors group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-12">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">
                    Site {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex gap-2">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-none font-black text-[8px] tracking-widest uppercase">
                      AVAILABLE
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4 mb-16 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={10} className="text-primary" />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60">
                      {v.address}
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none italic">
                    {v.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 uppercase font-medium leading-relaxed opacity-60 tracking-wider">
                    {v.description || "NO DATA TRANSMITTED FOR THIS SECTOR."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <Users size={12} className="opacity-30" />
                    <span className="text-[10px] font-bold tracking-tight">
                      {v.capacity} CAP
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign size={12} className="opacity-30" />
                    <span className="text-[10px] font-bold tracking-tight">
                      {v.daily_rate}/DAY
                    </span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 font-black uppercase tracking-widest text-[10px] h-12 border-2"
                  >
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Locate
                    </a>
                  </Button>
                  <Button
                    className="flex-1 font-black uppercase tracking-widest text-[10px] h-12"
                    onClick={() => {
                      setSelectedVenue(v);
                      setBookingOpen(true);
                    }}
                  >
                    Deploy
                  </Button>
                </div>
              </div>
            ))}
            {venues.length === 0 && (
              <div className="col-span-full py-32 text-center border-r border-b">
                <h3 className="text-xs font-black uppercase tracking-[0.5em] opacity-30 italic">
                  No Operational Arenas Located
                </h3>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="border-t border-l grid grid-cols-1">
          {myBookings.map((b) => {
            const v = venues.find((venue) => venue.id === b.venue_id);
            const isOwner = v?.owner_id === user?.user_id;
            const isOrganizer = b.organizer_id === user?.user_id;

            return (
              <div
                key={b.id}
                className="p-8 border-r border-b flex items-center justify-between group hover:bg-accent/20 transition-all"
              >
                <div className="flex items-center gap-12">
                  <div className="flex flex-col gap-2">
                    {isOwner && isOrganizer ? (
                      <Badge variant="outline" className="w-fit rounded-none border-primary text-primary text-[7px] font-black tracking-[0.2em] uppercase py-0.5">Self Deployment</Badge>
                    ) : isOwner ? (
                      <Badge variant="outline" className="w-fit rounded-none border-blue-500 text-blue-500 text-[7px] font-black tracking-[0.2em] uppercase py-0.5">Incoming Request</Badge>
                    ) : (
                      <Badge variant="outline" className="w-fit rounded-none border-muted-foreground text-muted-foreground text-[7px] font-black tracking-[0.2em] uppercase py-0.5">Outgoing Request</Badge>
                    )}
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30">
                        Site: {v?.name || "Unknown Arena"}
                      </span>
                      <h3 className="text-xl font-bold uppercase tracking-tighter">
                        {isOwner && !isOrganizer ? `Request from: ${b.organizer_name}` : "Operational Deployment"}
                      </h3>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-border" />

                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30">
                      Timeline
                    </span>
                    <div className="text-[10px] font-bold uppercase tracking-widest">
                      {new Date(b.start_date).toLocaleDateString()} //{" "}
                      {new Date(b.end_date).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="h-8 w-px bg-border" />

                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30">
                      Status
                    </span>
                    <div>
                      <Badge
                        className={cn(
                          "rounded-none font-black text-[8px] tracking-widest uppercase",
                          b.status === "confirmed"
                            ? "bg-green-500/10 text-green-500"
                            : b.status === "rejected"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-yellow-500/10 text-yellow-500",
                        )}
                      >
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 gap-2 font-black uppercase tracking-widest text-[9px] border-2"
                    onClick={() => {
                      setSelectedBooking(b);
                      fetchChat(b.id);
                      setChatOpen(true);
                    }}
                  >
                    <MessageSquare size={12} /> Comms
                  </Button>
                  {isOwner && b.status === "pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 font-black uppercase tracking-widest text-[9px] border-2 text-green-600 hover:bg-green-600 hover:text-white"
                        onClick={() => handleUpdateStatus(b.id, "confirmed")}
                      >
                        Authorize
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-4 font-black uppercase tracking-widest text-[9px] border-2 text-red-600 hover:bg-red-600 hover:text-white"
                        onClick={() => handleUpdateStatus(b.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {myBookings.length === 0 && (
            <div className="py-32 text-center border-r border-b italic text-xs opacity-20 uppercase tracking-widest">
              No operational logs found in current sector.
            </div>
          )}
        </div>
      )}

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-md border-0 rounded-none p-10">
          <DialogHeader className="space-y-6">
            <DialogTitle className="text-3xl font-bold uppercase tracking-tighter">
              Deployment Request
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
              Submit an operational request to reserve {selectedVenue?.name} for
              your tournament.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBooking} className="space-y-8 pt-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                  Select Arena Operation
                </Label>
                <select
                  className="w-full h-12 bg-transparent border-b rounded-none px-0 focus:outline-none focus:border-primary font-bold tracking-widest text-xs uppercase appearance-none cursor-pointer"
                  value={bookingData.tournament_id}
                  onChange={(e) =>
                    setBookingData({
                      ...bookingData,
                      tournament_id: e.target.value,
                    })
                  }
                  required
                >
                  {myTournaments.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      className="bg-background text-foreground"
                    >
                      {t.name}
                    </option>
                  ))}
                </select>
                {myTournaments.length === 0 && (
                  <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest pt-2">
                    No active arena operations found. Create a tournament first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                    Deployment Start
                  </Label>
                  <Input
                    type="date"
                    min={todayStr}
                    className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                    value={bookingData.start_date}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        start_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                    Deployment End
                  </Label>
                  <Input
                    type="date"
                    min={bookingData.start_date || todayStr}
                    className="h-12 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors font-bold tracking-widest text-xs uppercase"
                    value={bookingData.end_date}
                    onChange={(e) =>
                      setBookingData({
                        ...bookingData,
                        end_date: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-8">
              <Button
                type="submit"
                className="w-full h-14 font-black uppercase tracking-widest text-xs italic"
                disabled={myTournaments.length === 0}
              >
                Transmit Authorization Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-lg border-0 rounded-none p-0 flex flex-col h-[600px] overflow-hidden">
          <DialogHeader className="p-8 border-b bg-muted/30">
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter">
              Secure Channel // {selectedBooking?.organizer_name}
            </DialogTitle>
            <DialogDescription className="text-[9px] font-black uppercase tracking-widest opacity-40">
              Encrypted negotiation link established for deployment{" "}
              {String(selectedBooking?.id).split("-")[0]}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
            {chatMessages.map((msg, i) => {
              const isMe = msg.user_id === user?.user_id;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col",
                    isMe ? "items-end" : "items-start",
                  )}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-2">
                    {msg.username} //{" "}
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                  <div
                    className={cn(
                      "px-6 py-4 text-xs font-bold uppercase tracking-tight max-w-[80%] border-2",
                      isMe
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/10 border-muted",
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
            {chatMessages.length === 0 && (
              <div className="h-full flex items-center justify-center opacity-20 uppercase font-black text-[10px] tracking-[0.5em] italic">
                Awaiting initial transmission...
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-6 border-t bg-background flex gap-4"
          >
            <Input
              className="h-12 border-2 rounded-none focus-visible:ring-0 focus-visible:border-primary font-bold uppercase text-[10px] tracking-widest"
              placeholder="Type transmission..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button
              type="submit"
              className="h-12 px-8 font-black uppercase tracking-widest text-[10px] italic"
            >
              Send
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenuesPage;

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowRight, Eye, EyeOff, Search, Plus, Trash2, Save, X, GripVertical, Settings2, Check, ChevronUp, ChevronDown, Hash, Bookmark, BookmarkPlus, FolderOpen, HelpCircle, Keyboard, MousePointer2, Calculator, FileText, Percent } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Account {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  level: number;
  type: string;
  is_visible?: boolean;
  order_index?: number;
}

// Get background color based on account type
const getAccountTypeColor = (type: string, isSelected: boolean, isFocused: boolean): string => {
  if (isSelected) return "ring-2 ring-blue-500 bg-blue-100";
  if (isFocused) return "ring-2 ring-orange-500 bg-orange-100";
  
  switch (type) {
    case 'asset':
      return "bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
    case 'liability':
      return "bg-rose-50 hover:bg-rose-100 border-rose-200";
    case 'equity':
      return "bg-purple-50 hover:bg-purple-100 border-purple-200";
    case 'revenue':
      return "bg-sky-50 hover:bg-sky-100 border-sky-200";
    case 'expense':
      return "bg-amber-50 hover:bg-amber-100 border-amber-200";
    default:
      return "bg-gray-50 hover:bg-gray-100 border-gray-200";
  }
};

interface EntryLine {
  id: string;
  account_id: string;
  account_name: string;
  account_code: string;
  debit: number;
  credit: number;
  description: string;
  hasTax?: boolean;
  taxLineId?: string; // Reference to auto-generated tax line
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  entry_lines: EntryLine[];
  is_default: boolean;
  created_at: string;
}

// VAT Purchases Account (ضريبة القيمة المضافة للمشتريات)
const VAT_ACCOUNT_CODE = "110801";
const VAT_RATE = 0.15; // 15% VAT

// Draggable Account Card Component for normal mode
function DraggableAccountCard({
  account,
  index,
  isSelected,
  isInEntry,
  isFocused,
  isHidden,
  showNumbers,
  cardNumber,
  onSelect,
  onToggleVisibility,
}: {
  account: Account;
  index: number;
  isSelected: boolean;
  isInEntry: boolean;
  isFocused: boolean;
  isHidden: boolean;
  showNumbers: boolean;
  cardNumber: number;
  onSelect: () => void;
  onToggleVisibility: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isHidden ? 0.6 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger select if it's a quick click (not a drag)
    if (!isDragging) {
      onSelect();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "p-2 cursor-pointer transition-all hover:shadow-md text-center relative border",
        getAccountTypeColor(account.type, isSelected, isFocused),
        isInEntry && "border-b-2 border-b-green-500",
        isDragging && "shadow-lg cursor-grabbing",
        isHidden && "border-dashed border-2 border-gray-400 bg-gray-100"
      )}
      onClick={handleClick}
    >
      {/* Drag Handle */}
      <div 
        {...listeners} 
        className="absolute top-1 left-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-gray-400" />
      </div>
      {/* Card Number Badge */}
      {showNumbers && (
        <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md z-10">
          {cardNumber}
        </div>
      )}
      <div className="flex flex-col items-center gap-1">
        <div className={cn(
          "font-medium text-xs leading-tight line-clamp-2",
          isHidden ? "text-gray-500" : "text-gray-900"
        )}>{account.name_ar}</div>
        <div className="text-xs text-gray-500">{account.code}</div>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6",
            isHidden && "bg-green-100 hover:bg-green-200"
          )}
          onClick={onToggleVisibility}
          title={isHidden ? "إظهار الحساب" : "إخفاء الحساب"}
        >
          {isHidden ? (
            <Eye className="h-3 w-3 text-green-600" />
          ) : (
            <EyeOff className="h-3 w-3 text-gray-400" />
          )}
        </Button>
      </div>
    </Card>
  );
}

// Sortable Account Card Component for reorder mode
function SortableAccountCard({
  account,
  index,
  isSelected,
  isInEntry,
  isFocused,
  onSelect,
  onToggleVisibility,
}: {
  account: Account;
  index: number;
  isSelected: boolean;
  isInEntry: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onToggleVisibility: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-2 cursor-pointer transition-all hover:shadow-md text-center relative group border-2 border-dashed border-orange-300",
        getAccountTypeColor(account.type, isSelected, isFocused),
        isInEntry && "border-b-2 border-b-green-500",
        isDragging && "shadow-lg"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 cursor-grab active:cursor-grabbing p-1 rounded bg-orange-200 hover:bg-orange-300"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-orange-600" />
      </div>
      
      <div className="flex flex-col items-center gap-1 pt-4">
        <div className="font-medium text-gray-900 text-xs leading-tight line-clamp-2">{account.name_ar}</div>
        <div className="text-xs text-gray-500">{account.code}</div>
      </div>
    </Card>
  );
}

// Drag Overlay Card Component
function DragOverlayCard({ account }: { account: Account }) {
  return (
    <Card className="p-2 cursor-grabbing shadow-xl bg-blue-100 ring-2 ring-blue-500 text-center w-24">
      <div className="flex flex-col items-center gap-1">
        <div className="font-medium text-gray-900 text-xs leading-tight line-clamp-2">{account.name_ar}</div>
        <div className="text-xs text-gray-500">{account.code}</div>
      </div>
    </Card>
  );
}

// Droppable Entry Area Component
function DroppableEntryArea({ children, isOver }: { children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({
    id: 'entry-lines-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 overflow-auto transition-all duration-200 rounded-lg",
        isOver && "bg-blue-50 ring-2 ring-blue-400 ring-dashed"
      )}
    >
      {children}
    </div>
  );
}

export default function SmartJournalEntries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsOrder, setAccountsOrder] = useState<string[]>([]);
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set());
  const [showHiddenAccounts, setShowHiddenAccounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [entryLines, setEntryLines] = useState<EntryLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [entryDescription, setEntryDescription] = useState("");
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [activeField, setActiveField] = useState<'debit' | 'credit' | 'description'>('debit');
  const [focusedAccountIndex, setFocusedAccountIndex] = useState<number>(-1);
  const [isAccountsPanelFocused, setIsAccountsPanelFocused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showCardNumbers, setShowCardNumbers] = useState(false);
  const [numberInputBuffer, setNumberInputBuffer] = useState("");
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  
  // Template states
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const accountsPanelRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter and sort accounts
  const filteredAccounts = accountsOrder
    .map(id => accounts.find(a => a.id === id))
    .filter((account): account is Account => {
      if (!account) return false;
      const matchesSearch = searchQuery === "" || 
        account.name_ar.includes(searchQuery) || 
        account.code.includes(searchQuery) ||
        account.name_en.toLowerCase().includes(searchQuery.toLowerCase());
      // Show hidden accounts if toggle is on
      const isVisible = showHiddenAccounts || !hiddenAccounts.has(account.id);
      return matchesSearch && isVisible;
    });
  
  // Count hidden accounts for badge
  const hiddenAccountsCount = hiddenAccounts.size;

  // Active dragging account
  const activeAccount = activeId ? accounts.find(a => a.id === activeId) : null;

  useEffect(() => {
    fetchAccounts();
    fetchVisibilitySettings();
    fetchAccountsOrder();
    fetchTemplates();
  }, []);

  // Handle scroll indicators
  const handleScroll = useCallback(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      setCanScrollUp(scrollTop > 10);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 10);
    }
  }, []);

  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, filteredAccounts.length]);

  // Check scroll on accounts load
  useEffect(() => {
    setTimeout(handleScroll, 100);
  }, [filteredAccounts.length, handleScroll]);

  // Track space key state
  useEffect(() => {
    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).matches('input, textarea')) {
        setIsSpacePressed(true);
      }
    };
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleSpaceDown);
    window.addEventListener('keyup', handleSpaceUp);
    return () => {
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Space + Arrow keys for smooth scrolling (like mouse wheel)
      if (isSpacePressed && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInputField) {
        e.preventDefault();
        const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollElement) {
          const scrollAmount = 150; // pixels to scroll
          scrollElement.scrollBy({
            top: e.key === 'ArrowDown' ? scrollAmount : -scrollAmount,
            behavior: 'smooth'
          });
        }
        return;
      }

      // Arrow keys for accounts navigation - activate immediately from anywhere (except inputs)
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && !isInputField) {
        e.preventDefault();
        
        // Auto-activate accounts panel focus if not already active
        if (!isAccountsPanelFocused) {
          setIsAccountsPanelFocused(true);
          if (focusedAccountIndex < 0) {
            setFocusedAccountIndex(0);
          }
        }
        
        if (filteredAccounts.length > 0) {
          if (e.key === 'ArrowDown') {
            setFocusedAccountIndex(prev => 
              prev + 4 < filteredAccounts.length ? prev + 4 : prev
            );
          }
          if (e.key === 'ArrowUp') {
            setFocusedAccountIndex(prev => 
              prev >= 4 ? prev - 4 : prev
            );
          }
          if (e.key === 'ArrowRight') {
            setFocusedAccountIndex(prev => 
              prev < filteredAccounts.length - 1 ? prev + 1 : prev
            );
          }
          if (e.key === 'ArrowLeft') {
            setFocusedAccountIndex(prev => 
              prev > 0 ? prev - 1 : prev
            );
          }
        }
        return;
      }

      // Handle Enter and Escape when accounts panel is focused
      if (isAccountsPanelFocused && filteredAccounts.length > 0) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedAccountIndex >= 0 && focusedAccountIndex < filteredAccounts.length) {
            const account = filteredAccounts[focusedAccountIndex];
            handleAccountSelect(account);
            setIsAccountsPanelFocused(false);
          }
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsAccountsPanelFocused(false);
          setFocusedAccountIndex(-1);
        }
        return;
      }

      if (e.key === 'Escape' && activeRowIndex !== null) {
        // Cancel current line
        const newLines = [...entryLines];
        newLines.splice(activeRowIndex, 1);
        setEntryLines(newLines);
        setActiveRowIndex(null);
        e.preventDefault();
      }

      if (e.key === 'ArrowUp' && activeRowIndex !== null && activeRowIndex > 0 && !isAccountsPanelFocused) {
        setActiveRowIndex(activeRowIndex - 1);
        e.preventDefault();
      }

      if (e.key === 'ArrowDown' && activeRowIndex !== null && activeRowIndex < entryLines.length - 1 && !isAccountsPanelFocused) {
        setActiveRowIndex(activeRowIndex + 1);
        e.preventDefault();
      }

      if (e.shiftKey && e.key === 'Enter' && isInputField) {
        // Save current line and add new
        e.preventDefault();
        // Logic handled in input onKeyDown
      }

      // '+' key - Move to accounts panel to add new line
      if ((e.key === '+' || e.key === '=') && !isInputField) {
        e.preventDefault();
        setIsAccountsPanelFocused(true);
        setFocusedAccountIndex(0);
        accountsPanelRef.current?.focus();
      }

      // '*' key - Move focus to accounts panel for selection
      if (e.key === '*' && !isInputField) {
        e.preventDefault();
        setIsAccountsPanelFocused(true);
        setFocusedAccountIndex(focusedAccountIndex >= 0 ? focusedAccountIndex : 0);
        accountsPanelRef.current?.focus();
      }

      // Number keys for quick account selection when numbers mode is active
      if (showCardNumbers && !isInputField && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const newBuffer = numberInputBuffer + e.key;
        setNumberInputBuffer(newBuffer);
        
        // Wait for potential second digit
        setTimeout(() => {
          setNumberInputBuffer(prev => {
            if (prev === newBuffer) {
              const cardIndex = parseInt(newBuffer) - 1;
              if (cardIndex >= 0 && cardIndex < filteredAccounts.length) {
                const account = filteredAccounts[cardIndex];
                // Add account but stay in accounts panel (skip focus on debit field)
                handleAccountSelect(account, true);
                toast.success(`تم إضافة حساب "${account.name_ar}" - اضغط # للخروج من وضع الأرقام`);
              }
              return "";
            }
            return prev;
          });
        }, 400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRowIndex, entryLines, isAccountsPanelFocused, focusedAccountIndex, filteredAccounts, showCardNumbers, numberInputBuffer]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, code, name_ar, name_en, level, type")
        .eq("level", 4)
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error("خطأ في تحميل الحسابات: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountsOrder = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("smart_journal_account_order" as any)
        .select("account_order")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      const orderData = data as { account_order?: string[] } | null;
      if (orderData?.account_order) {
        setAccountsOrder(orderData.account_order);
      }
    } catch (error: any) {
      console.error("Error fetching accounts order:", error);
    }
  };

  const saveAccountsOrder = async (newOrder: string[]) => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from("smart_journal_account_order" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("smart_journal_account_order" as any)
          .update({ account_order: newOrder })
          .eq("id", (existing as any).id);
      } else {
        await supabase
          .from("smart_journal_account_order" as any)
          .insert({
            user_id: user.id,
            account_order: newOrder
          });
      }
    } catch (error: any) {
      console.error("Error saving accounts order:", error);
    }
  };

  // Set initial order when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && accountsOrder.length === 0) {
      setAccountsOrder(accounts.map(a => a.id));
    } else if (accounts.length > 0 && accountsOrder.length > 0) {
      // Add any new accounts that aren't in the order yet
      const existingIds = new Set(accountsOrder);
      const newIds = accounts.filter(a => !existingIds.has(a.id)).map(a => a.id);
      if (newIds.length > 0) {
        setAccountsOrder([...accountsOrder, ...newIds]);
      }
    }
  }, [accounts]);

  const fetchVisibilitySettings = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("smart_journal_account_visibility")
        .select("account_id, is_visible")
        .eq("user_id", user.id);

      if (error) throw error;
      
      const hidden = new Set<string>();
      data?.forEach(item => {
        if (!item.is_visible) {
          hidden.add(item.account_id);
        }
      });
      setHiddenAccounts(hidden);
    } catch (error: any) {
      console.error("Error fetching visibility settings:", error);
    }
  };

  const toggleAccountVisibility = async (accountId: string) => {
    if (!user?.id) return;

    const isCurrentlyHidden = hiddenAccounts.has(accountId);
    const newHidden = new Set(hiddenAccounts);
    
    if (isCurrentlyHidden) {
      newHidden.delete(accountId);
    } else {
      newHidden.add(accountId);
    }
    setHiddenAccounts(newHidden);

    try {
      const { data: existing } = await supabase
        .from("smart_journal_account_visibility")
        .select("id")
        .eq("account_id", accountId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("smart_journal_account_visibility")
          .update({ is_visible: isCurrentlyHidden })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("smart_journal_account_visibility")
          .insert({
            account_id: accountId,
            user_id: user.id,
            is_visible: isCurrentlyHidden
          });
      }
    } catch (error: any) {
      console.error("Error toggling visibility:", error);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("smart_journal_templates" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setTemplates((data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        entry_lines: t.entry_lines as EntryLine[],
        is_default: t.is_default,
        created_at: t.created_at
      })));
    } catch (error: any) {
      console.error("Error fetching templates:", error);
    }
  };

  // Save current entry as template
  const handleSaveAsTemplate = async () => {
    if (!user?.id || !templateName.trim()) {
      toast.error("يرجى إدخال اسم النموذج");
      return;
    }

    if (entryLines.length === 0) {
      toast.error("لا يوجد سطور لحفظها كنموذج");
      return;
    }

    setIsSavingTemplate(true);
    
    try {
      // Create template lines without values (keeping only account info)
      const templateLines = entryLines.map(line => ({
        id: crypto.randomUUID(),
        account_id: line.account_id,
        account_name: line.account_name,
        account_code: line.account_code,
        debit: 0,
        credit: 0,
        description: "",
        hasTax: line.hasTax,
      }));

      const { error } = await supabase
        .from("smart_journal_templates" as any)
        .insert({
          user_id: user.id,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          entry_lines: templateLines,
          is_default: false
        });

      if (error) throw error;

      toast.success(`تم حفظ النموذج "${templateName}" بنجاح`);
      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
      fetchTemplates();
    } catch (error: any) {
      toast.error("خطأ في حفظ النموذج: " + error.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Load a template
  const handleLoadTemplate = (template: Template) => {
    // Regenerate line IDs for the loaded template
    const newLines = template.entry_lines.map(line => ({
      ...line,
      id: crypto.randomUUID(),
      taxLineId: undefined // Reset tax line references
    }));
    
    setEntryLines(newLines);
    setActiveRowIndex(0);
    
    // Focus on first debit field
    if (newLines.length > 0) {
      setTimeout(() => {
        const ref = inputRefs.current[`debit-${newLines[0].id}`];
        ref?.focus();
        ref?.select();
      }, 100);
    }
    
    toast.success(`تم تحميل نموذج "${template.name}"`);
  };

  // Delete a template
  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    try {
      const { error } = await supabase
        .from("smart_journal_templates" as any)
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      toast.success(`تم حذف النموذج "${templateName}"`);
      fetchTemplates();
    } catch (error: any) {
      toast.error("خطأ في حذف النموذج: " + error.message);
    }
  };

  const handleAccountSelect = (account: Account, skipFocus: boolean = false) => {
    setSelectedAccountId(account.id);
    
    // Always add new line when account is selected (even if same account exists)
    const newLine: EntryLine = {
      id: crypto.randomUUID(),
      account_id: account.id,
      account_name: account.name_ar,
      account_code: account.code,
      debit: 0,
      credit: 0,
      description: ""
    };
    setEntryLines([...entryLines, newLine]);
    setActiveRowIndex(entryLines.length);
    setActiveField('debit');
    
    // Focus on debit field after render (unless skipFocus is true)
    if (!skipFocus) {
      setTimeout(() => {
        const ref = inputRefs.current[`debit-${newLine.id}`];
        ref?.focus();
        ref?.select();
      }, 50);
    }
  };

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setIsOverDropZone(over?.id === 'entry-lines-drop-zone');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setIsOverDropZone(false);

    if (!over) return;

    // In reorder mode, only allow reordering within accounts panel
    if (isReorderMode) {
      if (active.id !== over.id) {
        const oldIndex = accountsOrder.indexOf(active.id as string);
        const newIndex = accountsOrder.indexOf(over.id as string);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(accountsOrder, oldIndex, newIndex);
          setAccountsOrder(newOrder);
          saveAccountsOrder(newOrder);
        }
      }
      return;
    }

    // Normal mode: If dropped on entry lines area, add account
    if (over.id === 'entry-lines-drop-zone') {
      const account = accounts.find(a => a.id === active.id);
      if (account) {
        handleAccountSelect(account);
        toast.success(`تم إضافة حساب "${account.name_ar}" للقيد`);
      }
      return;
    }
  };

  const handleLineChange = (lineId: string, field: 'debit' | 'credit' | 'description', value: string) => {
    setEntryLines(lines => lines.map(line => {
      if (line.id !== lineId) return line;
      
      if (field === 'debit') {
        const numValue = parseFloat(value) || 0;
        return { ...line, debit: numValue, credit: numValue > 0 ? 0 : line.credit };
      }
      if (field === 'credit') {
        const numValue = parseFloat(value) || 0;
        return { ...line, credit: numValue, debit: numValue > 0 ? 0 : line.debit };
      }
      return { ...line, [field]: value };
    }));
  };

  const handleKeyDownInField = (e: React.KeyboardEvent, lineId: string, field: 'debit' | 'credit' | 'description') => {
    const line = entryLines.find(l => l.id === lineId);
    const isTaxLine = lineId.startsWith('tax-');

    // '+' key in debit or credit field - go back to accounts panel
    if ((e.key === '+' || e.key === '=') && (field === 'debit' || field === 'credit')) {
      e.preventDefault();
      setIsAccountsPanelFocused(true);
      setFocusedAccountIndex(0);
      accountsPanelRef.current?.focus();
      return;
    }

    // Handle 1 and 2 keys in credit field for tax selection
    if (field === 'credit' && !isTaxLine && line && (line.debit > 0 || line.credit > 0)) {
      if (e.key === '1') {
        e.preventDefault();
        // 1 = No tax, remove if exists and move to description
        if (line.hasTax && line.taxLineId) {
          toggleLineTax(lineId);
        }
        setTimeout(() => {
          inputRefs.current[`description-${lineId}`]?.focus();
        }, 50);
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        // 2 = Add tax and move to description
        if (!line.hasTax) {
          toggleLineTax(lineId);
        }
        setTimeout(() => {
          inputRefs.current[`description-${lineId}`]?.focus();
        }, 50);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Move to next field
      if (field === 'debit') {
        inputRefs.current[`credit-${lineId}`]?.focus();
      } else if (field === 'credit') {
        inputRefs.current[`description-${lineId}`]?.focus();
      } else if (field === 'description') {
        // Move focus to accounts panel
        setIsAccountsPanelFocused(true);
        setFocusedAccountIndex(0);
        accountsPanelRef.current?.focus();
      }
    }
    
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      // Move focus to accounts panel for new line
      setIsAccountsPanelFocused(true);
      setFocusedAccountIndex(0);
      accountsPanelRef.current?.focus();
    }

    // '+' key in description field - open new line
    if ((e.key === '+' || e.key === '=') && field === 'description') {
      e.preventDefault();
      setIsAccountsPanelFocused(true);
      setFocusedAccountIndex(0);
      accountsPanelRef.current?.focus();
    }

    // Shift key in description field - show save confirmation dialog
    if (e.key === 'Shift' && field === 'description') {
      e.preventDefault();
      if (entryLines.length > 0) {
        setShowSaveConfirmDialog(true);
      }
    }
  };

  const removeLine = (lineId: string) => {
    // Also remove associated tax line if exists
    const lineToRemove = entryLines.find(l => l.id === lineId);
    if (lineToRemove?.taxLineId) {
      setEntryLines(lines => lines.filter(line => line.id !== lineId && line.id !== lineToRemove.taxLineId));
    } else {
      // Also check if this is a tax line and remove reference from parent
      setEntryLines(lines => lines.filter(line => line.id !== lineId).map(line => 
        line.taxLineId === lineId ? { ...line, taxLineId: undefined, hasTax: false } : line
      ));
    }
    if (activeRowIndex !== null && activeRowIndex >= entryLines.length - 1) {
      setActiveRowIndex(Math.max(0, entryLines.length - 2));
    }
  };

  // Toggle tax for a line
  const toggleLineTax = async (lineId: string) => {
    const line = entryLines.find(l => l.id === lineId);
    if (!line) return;

    if (line.hasTax && line.taxLineId) {
      // Remove tax - delete tax line
      setEntryLines(lines => 
        lines.filter(l => l.id !== line.taxLineId).map(l => 
          l.id === lineId ? { ...l, hasTax: false, taxLineId: undefined } : l
        )
      );
    } else {
      // Add tax - find VAT account and create tax line
      const vatAccount = accounts.find(a => a.code === VAT_ACCOUNT_CODE);
      if (!vatAccount) {
        toast.error("لم يتم العثور على حساب ضريبة المشتريات");
        return;
      }

      const baseAmount = line.debit || line.credit;
      const taxAmount = baseAmount * VAT_RATE;
      const taxLineId = `tax-${lineId}-${Date.now()}`;

      const taxLine: EntryLine = {
        id: taxLineId,
        account_id: vatAccount.id,
        account_name: vatAccount.name_ar,
        account_code: vatAccount.code,
        debit: line.debit > 0 ? taxAmount : 0,
        credit: line.credit > 0 ? taxAmount : 0,
        description: `ضريبة - ${line.account_name}`,
        hasTax: false,
      };

      // Insert tax line right after the parent line
      setEntryLines(lines => {
        const lineIndex = lines.findIndex(l => l.id === lineId);
        const newLines = [...lines];
        newLines[lineIndex] = { ...line, hasTax: true, taxLineId };
        newLines.splice(lineIndex + 1, 0, taxLine);
        return newLines;
      });
    }
  };

  const calculateTotals = () => {
    const totalDebit = entryLines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = entryLines.reduce((sum, line) => sum + line.credit, 0);
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const handleSaveEntry = async () => {
    const { totalDebit, totalCredit, isBalanced } = calculateTotals();
    
    if (entryLines.length === 0) {
      toast.error("يجب إضافة سطر واحد على الأقل");
      return;
    }

    if (!isBalanced) {
      toast.error(`القيد غير متوازن! المدين: ${totalDebit.toLocaleString()} - الدائن: ${totalCredit.toLocaleString()}`);
      return;
    }

    try {
      // Generate entry number
      const year = new Date().getFullYear();
      const { data: lastEntry } = await supabase
        .from("journal_entries")
        .select("entry_number")
        .like("entry_number", `JE-${year}%`)
        .order("entry_number", { ascending: false })
        .limit(1);

      let entryNumber = `JE-${year}000001`;
      if (lastEntry && lastEntry.length > 0) {
        const lastNumber = parseInt(lastEntry[0].entry_number.slice(-6));
        entryNumber = `JE-${year}${String(lastNumber + 1).padStart(6, "0")}`;
      }

      // Create journal entry
      const { data: journalEntry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          entry_number: entryNumber,
          date: entryDate,
          description: entryDescription || "قيد ذكي",
          reference: `smart_journal_${Date.now()}`,
          created_by: user?.id
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create journal entry lines
      const lines = entryLines.map(line => ({
        journal_entry_id: journalEntry.id,
        account_id: line.account_id,
        debit: line.debit,
        credit: line.credit,
        description: line.description || entryDescription || "قيد ذكي"
      }));

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(lines);

      if (linesError) throw linesError;

      toast.success(`تم حفظ القيد رقم ${entryNumber} بنجاح`);
      
      // Reset form
      setEntryLines([]);
      setSelectedAccountId(null);
      setActiveRowIndex(null);
      setEntryDescription("");
    } catch (error: any) {
      toast.error("خطأ في حفظ القيد: " + error.message);
    }
  };

  const { totalDebit, totalCredit, isBalanced } = calculateTotals();

  // Handle save confirmation
  const handleSaveConfirm = () => {
    setShowSaveConfirmDialog(false);
    handleSaveEntry();
  };

  return (
    <>
      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveConfirmDialog} onOpenChange={setShowSaveConfirmDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حفظ القيد</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد حفظ هذا القيد؟
              {!isBalanced && (
                <span className="block mt-2 text-red-500 font-medium">
                  تحذير: القيد غير متوازن! الفرق: {Math.abs(totalDebit - totalCredit).toLocaleString()}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction 
              onClick={handleSaveConfirm}
              disabled={!isBalanced}
              className="bg-blue-500 hover:bg-blue-600"
            >
              نعم، احفظ
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>حفظ كنموذج</DialogTitle>
            <DialogDescription>
              احفظ هيكل القيد الحالي كنموذج لاستخدامه لاحقاً
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم النموذج</label>
              <Input
                placeholder="مثال: قيد مصروفات الرواتب"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">وصف (اختياري)</label>
              <Input
                placeholder="وصف مختصر للنموذج..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium mb-1">سيتم حفظ:</p>
              <ul className="list-disc list-inside space-y-1">
                {entryLines.filter(l => !l.id.startsWith('tax-')).map((line, i) => (
                  <li key={i}>{line.account_name} ({line.account_code})</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || isSavingTemplate}
              className="gap-2"
            >
              <BookmarkPlus className="h-4 w-4" />
              {isSavingTemplate ? "جاري الحفظ..." : "حفظ النموذج"}
            </Button>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/accounting')} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">قيود ذكية</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Help & Instructions Dialog */}
              <Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="text-blue-600 border-blue-200 hover:bg-blue-50" title="المساعدة والتعليمات">
                      <HelpCircle className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[400px] max-h-[500px] overflow-y-auto text-right">
                    <DropdownMenuLabel className="text-lg font-bold text-center border-b pb-2">
                      📖 دليل استخدام القيود الذكية
                    </DropdownMenuLabel>
                    
                    {/* Keyboard Shortcuts Section */}
                    <div className="p-3 bg-blue-50 rounded-lg m-2">
                      <div className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                        <Keyboard className="h-4 w-4" />
                        اختصارات لوحة المفاتيح
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span>إضافة حساب جديد</span>
                          <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">+ أو =</kbd>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>التركيز على الحسابات</span>
                          <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">*</kbd>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>حفظ القيد</span>
                          <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">Shift</kbd>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>تعطيل الضريبة</span>
                          <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">1</kbd>
                          <span className="text-gray-500 text-xs">(في حقل الدائن)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>تفعيل الضريبة</span>
                          <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">2</kbd>
                          <span className="text-gray-500 text-xs">(في حقل الدائن)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>العودة لاختيار حساب</span>
                          <kbd className="px-2 py-0.5 bg-white rounded border text-xs font-mono">Enter</kbd>
                          <span className="text-gray-500 text-xs">(في الوصف)</span>
                        </div>
                      </div>
                    </div>

                    {/* Mouse & Drag Section */}
                    <div className="p-3 bg-green-50 rounded-lg m-2">
                      <div className="flex items-center gap-2 font-semibold text-green-800 mb-2">
                        <MousePointer2 className="h-4 w-4" />
                        السحب والإفلات
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <p>• <strong>الوضع العادي:</strong> اسحب بطاقة الحساب وأفلتها في جدول القيود</p>
                        <p>• <strong>وضع الترتيب:</strong> اضغط على "ترتيب" لتغيير مواقع البطاقات</p>
                        <p>• <strong>الإخفاء:</strong> اضغط على أيقونة العين في البطاقة لإخفائها</p>
                      </div>
                    </div>

                    {/* Number Mode Section */}
                    <div className="p-3 bg-purple-50 rounded-lg m-2">
                      <div className="flex items-center gap-2 font-semibold text-purple-800 mb-2">
                        <Hash className="h-4 w-4" />
                        وضع الأرقام
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <p>• اضغط على زر <kbd className="px-1.5 bg-white rounded border">#</kbd> لإظهار أرقام البطاقات</p>
                        <p>• اكتب رقم البطاقة لاختيارها بسرعة</p>
                        <p>• يمكن تكرار نفس الحساب في أسطر متعددة</p>
                      </div>
                    </div>

                    {/* VAT Section */}
                    <div className="p-3 bg-amber-50 rounded-lg m-2">
                      <div className="flex items-center gap-2 font-semibold text-amber-800 mb-2">
                        <Percent className="h-4 w-4" />
                        ضريبة القيمة المضافة
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <p>• الضريبة 15% تُحسب تلقائياً على حسابات المصروفات</p>
                        <p>• يُضاف سطر ضريبة تلقائي غير قابل للتعديل</p>
                        <p>• استخدم <kbd className="px-1.5 bg-white rounded border">1</kbd> أو <kbd className="px-1.5 bg-white rounded border">2</kbd> للتحكم بالضريبة</p>
                      </div>
                    </div>

                    {/* Templates Section */}
                    <div className="p-3 bg-sky-50 rounded-lg m-2">
                      <div className="flex items-center gap-2 font-semibold text-sky-800 mb-2">
                        <FileText className="h-4 w-4" />
                        النماذج
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <p>• احفظ هيكل القيد المتكرر كنموذج</p>
                        <p>• النموذج يحفظ الحسابات فقط (بدون المبالغ)</p>
                        <p>• استدعِ النموذج وأدخل القيم مباشرة</p>
                      </div>
                    </div>

                    {/* Balance Check Section */}
                    <div className="p-3 bg-rose-50 rounded-lg m-2">
                      <div className="flex items-center gap-2 font-semibold text-rose-800 mb-2">
                        <Calculator className="h-4 w-4" />
                        التوازن
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <p>• يظهر ملخص القيد أسفل الجدول</p>
                        <p>• القيد المتوازن = إجمالي المدين يساوي الدائن</p>
                        <p>• لا يمكن حفظ قيد غير متوازن</p>
                      </div>
                    </div>

                    {/* Visibility Section */}
                    <div className="p-3 bg-gray-100 rounded-lg m-2">
                      <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                        <Eye className="h-4 w-4" />
                        إظهار/إخفاء الحسابات
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-700">
                        <p>• اضغط على زر العين البنفسجي لإظهار الحسابات المخفية</p>
                        <p>• الرقم على الزر يعرض عدد الحسابات المخفية</p>
                        <p>• لإلغاء الإخفاء: اظهر المخفية ثم اضغط على أيقونة العين في البطاقة</p>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Dialog>
              {/* Templates Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FolderOpen className="h-4 w-4" />
                    النماذج
                    {templates.length > 0 && (
                      <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                        {templates.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>النماذج المحفوظة</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {templates.length === 0 ? (
                    <div className="py-4 text-center text-sm text-gray-500">
                      لا توجد نماذج محفوظة
                    </div>
                  ) : (
                    templates.map((template) => (
                      <DropdownMenuItem
                        key={template.id}
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-gray-500 truncate">{template.description}</div>
                          )}
                          <div className="text-xs text-gray-400">
                            {template.entry_lines.length} حسابات
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id, template.name);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save as Template Button */}
              <Button
                variant="outline"
                onClick={() => setShowSaveTemplateDialog(true)}
                disabled={entryLines.length === 0}
                className="gap-2"
                title="حفظ كنموذج"
              >
                <BookmarkPlus className="h-4 w-4" />
                حفظ كنموذج
              </Button>

              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-40"
              />
              <Button
                onClick={handleSaveEntry}
                disabled={entryLines.length === 0 || !isBalanced}
                className="bg-blue-500 hover:bg-blue-600 gap-2"
              >
                <Save className="h-4 w-4" />
                حفظ القيد (Shift)
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-80px)]">
          {/* Right Panel - Accounts */}
          <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
            <div className="h-full bg-gray-50 p-4 flex flex-col">
              {/* Mode Toggle and Search */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={isReorderMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsReorderMode(!isReorderMode)}
                  className={cn(
                    "gap-2 shrink-0",
                    isReorderMode && "bg-orange-500 hover:bg-orange-600"
                  )}
                >
                  {isReorderMode ? (
                    <>
                      <Check className="h-4 w-4" />
                      تم
                    </>
                  ) : (
                    <>
                      <Settings2 className="h-4 w-4" />
                      ترتيب
                    </>
                  )}
                </Button>
                
                {/* Toggle Hidden Accounts Button */}
                <Button
                  variant={showHiddenAccounts ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowHiddenAccounts(!showHiddenAccounts)}
                  className={cn(
                    "gap-1 shrink-0 relative",
                    showHiddenAccounts && "bg-purple-500 hover:bg-purple-600"
                  )}
                  title={showHiddenAccounts ? "إخفاء الحسابات المخفية" : "إظهار الحسابات المخفية"}
                >
                  {showHiddenAccounts ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  {hiddenAccountsCount > 0 && (
                    <span className={cn(
                      "absolute -top-1 -left-1 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full",
                      showHiddenAccounts 
                        ? "bg-white text-purple-600" 
                        : "bg-purple-500 text-white"
                    )}>
                      {hiddenAccountsCount}
                    </span>
                  )}
                </Button>
                
                {/* Toggle Card Numbers Button */}
                <Button
                  variant={showCardNumbers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCardNumbers(!showCardNumbers)}
                  className={cn(
                    "gap-1 shrink-0",
                    showCardNumbers && "bg-blue-500 hover:bg-blue-600"
                  )}
                  title={showCardNumbers ? "إخفاء الأرقام" : "إظهار الأرقام"}
                >
                  <Hash className="h-4 w-4" />
                </Button>
                
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="بحث بالاسم أو الرقم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 bg-white"
                  />
                </div>
              </div>

              {/* Mode Hint */}
              <div className={cn(
                "text-xs mb-2 text-center py-1 rounded",
                isReorderMode ? "bg-orange-100 text-orange-700" : "text-gray-500"
              )}>
                {isReorderMode 
                  ? "⚙️ وضع الترتيب: اسحب البطاقات لتغيير مواقعها" 
                  : "اسحب الحساب وأفلته في منطقة القيد أو اضغط لإضافته"
                }
              </div>

              {/* Accounts List with Scroll Indicators */}
              <div className="relative flex-1">
                {/* Scroll Up Indicator */}
                {canScrollUp && (
                  <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
                    <div className="bg-gradient-to-b from-white via-white/90 to-transparent w-full py-2 flex justify-center animate-fade-in">
                      <ChevronUp className="h-5 w-5 text-blue-500 animate-bounce" />
                    </div>
                  </div>
                )}
                
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                  <div
                    ref={accountsPanelRef}
                    tabIndex={0}
                    className={cn(
                      "outline-none rounded-lg p-1",
                      isAccountsPanelFocused && "ring-2 ring-blue-500",
                      isReorderMode && "bg-orange-50"
                    )}
                    onFocus={() => {
                      setIsAccountsPanelFocused(true);
                      if (focusedAccountIndex < 0) setFocusedAccountIndex(0);
                    }}
                    onBlur={() => {
                      setIsAccountsPanelFocused(false);
                    }}
                  >
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
                    ) : filteredAccounts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">لا توجد حسابات</div>
                    ) : (
                      <SortableContext items={filteredAccounts.map(a => a.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-4 gap-2">
                          {filteredAccounts.map((account, index) => (
                            isReorderMode ? (
                              <SortableAccountCard
                                key={account.id}
                                account={account}
                                index={index}
                                isSelected={selectedAccountId === account.id}
                                isInEntry={entryLines.some(l => l.account_id === account.id)}
                                isFocused={isAccountsPanelFocused && focusedAccountIndex === index}
                                onSelect={() => {}}
                                onToggleVisibility={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <DraggableAccountCard
                                key={account.id}
                                account={account}
                                index={index}
                                isSelected={selectedAccountId === account.id}
                                isInEntry={entryLines.some(l => l.account_id === account.id)}
                                isFocused={isAccountsPanelFocused && focusedAccountIndex === index}
                                isHidden={hiddenAccounts.has(account.id)}
                                showNumbers={showCardNumbers}
                                cardNumber={index + 1}
                                onSelect={() => handleAccountSelect(account)}
                                onToggleVisibility={(e) => {
                                  e.stopPropagation();
                                  toggleAccountVisibility(account.id);
                                }}
                              />
                            )
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </div>
                  
                  {/* Show hidden accounts count */}
                  {hiddenAccounts.size > 0 && (
                    <div className="mt-4 text-center">
                      <Button
                        variant="link"
                        className="text-gray-500 text-sm"
                        onClick={() => setHiddenAccounts(new Set())}
                      >
                        <EyeOff className="h-3 w-3 ml-1" />
                        {hiddenAccounts.size} حسابات مخفية - إظهار الكل
                      </Button>
                    </div>
                  )}
                </ScrollArea>
                
                {/* Scroll Down Indicator */}
                {canScrollDown && (
                  <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
                    <div className="bg-gradient-to-t from-white via-white/90 to-transparent w-full py-2 flex justify-center animate-fade-in">
                      <ChevronDown className="h-5 w-5 text-blue-500 animate-bounce" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          {/* Resizable Handle */}
          <ResizableHandle withHandle className="bg-gray-200 hover:bg-blue-400 transition-colors" />

          {/* Left Panel - Entry Lines */}
          <ResizablePanel defaultSize={60} minSize={40} maxSize={75}>
            <div className="h-full bg-white p-6 flex flex-col">
              {/* Entry Description */}
              <div className="mb-4">
                <Input
                  placeholder="وصف القيد..."
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  className="text-lg"
                />
              </div>

              {/* Entry Lines Table with Droppable */}
              <DroppableEntryArea isOver={isOverDropZone}>
                {entryLines.length === 0 ? (
                  <div className={cn(
                    "flex flex-col items-center justify-center h-full text-gray-400 transition-colors rounded-lg",
                    isOverDropZone && "bg-blue-100 text-blue-600"
                  )}>
                    <Plus className="h-12 w-12 mb-4" />
                    <p className="text-lg">
                      {isOverDropZone ? "أفلت هنا لإضافة الحساب" : "اختر حساب من القائمة لبدء القيد"}
                    </p>
                    <p className="text-sm mt-2">أو اسحب الحساب وأفلته هنا</p>
                    <p className="text-sm mt-2">Enter: الحقل التالي | Shift+Enter: سطر جديد | Esc: إلغاء</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-right p-3 font-medium text-gray-600 w-8">#</th>
                        <th className="text-right p-3 font-medium text-gray-600">الحساب</th>
                        <th className="text-right p-3 font-medium text-gray-600 w-32">مدين</th>
                        <th className="text-right p-3 font-medium text-gray-600 w-32">دائن</th>
                        <th className="text-right p-3 font-medium text-gray-600 w-20">ضريبة</th>
                        <th className="text-right p-3 font-medium text-gray-600">الوصف</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entryLines.map((line, index) => {
                        const isTaxLine = line.id.startsWith('tax-');
                        return (
                          <tr
                            key={line.id}
                            className={cn(
                              "border-b transition-colors",
                              activeRowIndex === index ? "bg-blue-50" : "hover:bg-gray-50",
                              isTaxLine && "bg-amber-50/50"
                            )}
                            onClick={() => setActiveRowIndex(index)}
                          >
                            <td className="p-3 text-gray-500">{index + 1}</td>
                            <td className="p-3">
                              <div className={cn("font-medium", isTaxLine && "text-amber-700")}>
                                {isTaxLine && "↳ "}{line.account_name}
                              </div>
                              <div className="text-sm text-gray-500">{line.account_code}</div>
                            </td>
                            <td className="p-3">
                              <Input
                                ref={(el) => inputRefs.current[`debit-${line.id}`] = el}
                                type="number"
                                value={line.debit || ""}
                                onChange={(e) => handleLineChange(line.id, 'debit', e.target.value)}
                                onKeyDown={(e) => handleKeyDownInField(e, line.id, 'debit')}
                                onFocus={() => {
                                  setActiveRowIndex(index);
                                  setActiveField('debit');
                                }}
                                className={cn(
                                  "text-left",
                                  line.debit > 0 && "bg-green-50 border-green-300"
                                )}
                                placeholder="0"
                                disabled={isTaxLine}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                ref={(el) => inputRefs.current[`credit-${line.id}`] = el}
                                type="number"
                                value={line.credit || ""}
                                onChange={(e) => handleLineChange(line.id, 'credit', e.target.value)}
                                onKeyDown={(e) => handleKeyDownInField(e, line.id, 'credit')}
                                onFocus={() => {
                                  setActiveRowIndex(index);
                                  setActiveField('credit');
                                }}
                                className={cn(
                                  "text-left",
                                  line.credit > 0 && "bg-red-50 border-red-300"
                                )}
                                placeholder="0"
                                disabled={isTaxLine}
                              />
                            </td>
                            <td className="p-3 text-center">
                              {!isTaxLine && (line.debit > 0 || line.credit > 0) && (
                                <Button
                                  variant={line.hasTax ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-7 text-xs px-2",
                                    line.hasTax 
                                      ? "bg-amber-500 hover:bg-amber-600 text-white" 
                                      : "text-gray-500 hover:text-amber-600"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLineTax(line.id);
                                  }}
                                >
                                  {line.hasTax ? "✓ ضريبة" : "بدون"}
                                </Button>
                              )}
                            </td>
                            <td className="p-3">
                              <Input
                                ref={(el) => inputRefs.current[`description-${line.id}`] = el}
                                value={line.description}
                                onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                                onKeyDown={(e) => handleKeyDownInField(e, line.id, 'description')}
                                onFocus={() => {
                                  setActiveRowIndex(index);
                                  setActiveField('description');
                                }}
                                placeholder="وصف..."
                                disabled={isTaxLine}
                              />
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeLine(line.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Balance Summary Row */}
                      <tr className="bg-gray-100/50">
                        <td colSpan={2} className="p-3 text-left">
                          <span className={cn(
                            "text-sm font-medium",
                            isBalanced ? "text-green-600" : "text-red-500"
                          )}>
                            {isBalanced ? "✓ متوازن" : "✗ غير متوازن"}
                          </span>
                        </td>
                        <td className="p-3 text-left">
                          <span className="text-sm text-gray-400">{totalDebit.toLocaleString()}</span>
                        </td>
                        <td className="p-3 text-left">
                          <span className="text-sm text-gray-400">{totalCredit.toLocaleString()}</span>
                        </td>
                        <td className="p-3"></td>
                        <td className="p-3 text-left">
                          {!isBalanced && (
                            <span className="text-sm text-gray-400">
                              الفرق: {Math.abs(totalDebit - totalCredit).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </DroppableEntryArea>

              {/* Totals Footer */}
              {entryLines.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-8">
                      <div>
                        <span className="text-gray-500">مجموع المدين:</span>
                        <span className="font-bold text-lg mr-2 text-green-600">
                          {totalDebit.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">مجموع الدائن:</span>
                        <span className="font-bold text-lg mr-2 text-red-600">
                          {totalCredit.toLocaleString()}
                        </span>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-sm font-medium",
                        isBalanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {isBalanced ? "✓ متوازن" : `✗ فرق: ${Math.abs(totalDebit - totalCredit).toLocaleString()}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEntryLines([]);
                          setSelectedAccountId(null);
                          setActiveRowIndex(null);
                        }}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        مسح الكل
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAccount ? <DragOverlayCard account={activeAccount} /> : null}
      </DragOverlay>
    </DndContext>
    </>
  );
}

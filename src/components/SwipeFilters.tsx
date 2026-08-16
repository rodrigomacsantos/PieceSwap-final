import { useState } from "react";
import { Filter, Crown, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Link } from "react-router-dom";

const CATEGORIES = [
  "Technic",
  "Star Wars",
  "City",
  "Creator Expert",
  "Marvel",
  "Harry Potter",
  "Ninjago",
  "Architecture",
  "Minifiguras",
  "DC Comics",
  "Ideas",
  "Creator",
  "Friends",
  "Speed Champions",
  "Duplo",
];

export interface SwipeFilterValues {
  maxDistance: number | null; // km, null = no filter
  categories: string[];
  minPrice: number | null; // swap coins, null = no filter
  maxPrice: number | null; // swap coins, null = no filter
}

interface SwipeFiltersProps {
  isPremium: boolean;
  filters: SwipeFilterValues;
  onFiltersChange: (filters: SwipeFilterValues) => void;
}

export const defaultFilters: SwipeFilterValues = {
  maxDistance: null,
  categories: [],
  minPrice: null,
  maxPrice: null,
};

const SwipeFilters = ({ isPremium, filters, onFiltersChange }: SwipeFiltersProps) => {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<SwipeFilterValues>(filters);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalFilters(filters);
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(defaultFilters);
  };

  const toggleCategory = (cat: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const activeFilterCount =
    (filters.maxDistance !== null ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.maxPrice !== null || filters.minPrice !== null ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-xl relative">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {!isPremium && <Lock className="w-3 h-3 ml-2 text-muted-foreground" />}
          {isPremium && activeFilterCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Sugestões
            {isPremium && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {!isPremium ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-display font-bold text-foreground mb-2">
              Filtros Premium
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Com o plano Premium, podes filtrar sugestões por distância, categoria e preço para encontrares trocas perfeitas.
            </p>
            <Link to="/premium">
              <Button>
                <Crown className="w-4 h-4 mr-2" />
                Desbloquear Filtros
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8 py-4">
            {/* Distance Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Distância máxima</Label>
                <span className="text-sm text-muted-foreground">
                  {localFilters.maxDistance !== null ? `${localFilters.maxDistance} km` : "Sem limite"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[localFilters.maxDistance ?? 200]}
                  onValueChange={([val]) =>
                    setLocalFilters((prev) => ({ ...prev, maxDistance: val }))
                  }
                  min={5}
                  max={200}
                  step={5}
                  className="flex-1"
                />
                {localFilters.maxDistance !== null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setLocalFilters((prev) => ({ ...prev, maxDistance: null }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {localFilters.maxDistance === null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalFilters((prev) => ({ ...prev, maxDistance: 50 }))}
                >
                  Ativar filtro de distância
                </Button>
              )}
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Categorias</Label>
                {localFilters.categories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0 text-xs text-muted-foreground"
                    onClick={() => setLocalFilters((prev) => ({ ...prev, categories: [] }))}
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = localFilters.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Intervalo de Preço (SwapCoins)</Label>
                <span className="text-sm text-muted-foreground">
                  {localFilters.maxPrice !== null || localFilters.minPrice !== null
                    ? `${(localFilters.minPrice ?? 0).toLocaleString()} SC - ${(localFilters.maxPrice ?? 50000).toLocaleString()} SC`
                    : "Sem limite"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Slider
                  value={[localFilters.minPrice ?? 0, localFilters.maxPrice ?? 50000]}
                  onValueChange={([min, max]) =>
                    setLocalFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }))
                  }
                  min={0}
                  max={50000}
                  step={500}
                  className="flex-1"
                />
                {(localFilters.maxPrice !== null || localFilters.minPrice !== null) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setLocalFilters((prev) => ({ ...prev, minPrice: null, maxPrice: null }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {localFilters.maxPrice === null && localFilters.minPrice === null && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocalFilters((prev) => ({ ...prev, minPrice: 0, maxPrice: 10000 }))}
                >
                  Ativar filtro de preço
                </Button>
              )}
            </div>
          </div>
        )}

        {isPremium && (
          <SheetFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Limpar tudo
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Aplicar filtros
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SwipeFilters;

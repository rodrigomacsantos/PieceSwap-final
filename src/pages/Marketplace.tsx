import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Grid3X3, LayoutList, ArrowUpDown, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useListings } from "@/hooks/useListings";

const categories = [
  "Todos",
  "Technic",
  "Star Wars",
  "City",
  "Creator Expert",
  "Marvel",
  "Harry Potter",
  "Ninjago",
  "Architecture",
  "Minifiguras",
];

const conditions = [
  { value: "all", label: "Todas" },
  { value: "novo", label: "Novo" },
  { value: "como novo", label: "Como novo" },
  { value: "usado", label: "Usado" },
];

type SortOption = "recent" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "price_asc", label: "Preço: menor → maior" },
  { value: "price_desc", label: "Preço: maior → menor" },
  { value: "name_asc", label: "Nome: A → Z" },
  { value: "name_desc", label: "Nome: Z → A" },
];

interface MarketplaceFilters {
  condition: string;
  minPrice: number | null;
  maxPrice: number | null;
}

const defaultFilters: MarketplaceFilters = {
  condition: "all",
  minPrice: null,
  maxPrice: null,
};

const Marketplace = () => {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filters, setFilters] = useState<MarketplaceFilters>(defaultFilters);
  const [localFilters, setLocalFilters] = useState<MarketplaceFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { listings, loading, fetchListings } = useListings();

  useEffect(() => {
    fetchListings();
  }, []);

  const activeFilterCount =
    (filters.condition !== "all" ? 1 : 0) +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0);

  const filteredAndSortedProducts = useMemo(() => {
    let result = listings.filter((listing) => {
      // Filter out trade-only listings (no price) from marketplace
      if (!listing.price_swap_coins && listing.accepts_trades) return false;
      
      const matchesCategory = selectedCategory === "Todos" || listing.category === selectedCategory;
      const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCondition = filters.condition === "all" || listing.condition === filters.condition;
      const price = listing.price_swap_coins || 0;
      const matchesMinPrice = filters.minPrice === null || price >= filters.minPrice;
      const matchesMaxPrice = filters.maxPrice === null || price <= filters.maxPrice;
      return matchesCategory && matchesSearch && matchesCondition && matchesMinPrice && matchesMaxPrice;
    });

    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.price_swap_coins || 0) - (b.price_swap_coins || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.price_swap_coins || 0) - (a.price_swap_coins || 0));
        break;
      case "name_asc":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "name_desc":
        result.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        break;
    }

    // Always sort boosted (non-expired) listings to the top
    const now = new Date().toISOString();
    result.sort((a, b) => {
      const aBoosted = a.boost_expires_at && a.boost_expires_at > now ? 1 : 0;
      const bBoosted = b.boost_expires_at && b.boost_expires_at > now ? 1 : 0;
      return bBoosted - aBoosted;
    });

    return result;
  }, [listings, selectedCategory, searchQuery, sortBy, filters]);

  const handleOpenFilters = (isOpen: boolean) => {
    if (isOpen) setLocalFilters(filters);
    setFiltersOpen(isOpen);
  };

  const handleApplyFilters = () => {
    setFilters(localFilters);
    setFiltersOpen(false);
  };

  const handleResetFilters = () => {
    setLocalFilters(defaultFilters);
  };

  const handleClearAllFilters = () => {
    setFilters(defaultFilters);
    setSortBy("recent");
    setSelectedCategory("Todos");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pb-16" style={{ paddingTop: 'calc(6rem + var(--banner-height, 0px))' }}>
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              Marketplace
            </h1>
            <p className="text-muted-foreground">
              Encontra peças e sets LEGO de outros colecionadores
            </p>
          </motion.div>

          {/* Search, Sort and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4 mb-8"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar peças, sets, minifiguras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl bg-card border-border"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-12 w-full md:w-[220px] rounded-xl">
                <ArrowUpDown className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filters Sheet */}
            <Sheet open={filtersOpen} onOpenChange={handleOpenFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-xl relative">
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    Filtros
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-8 py-6">
                  {/* Condition */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Condição</Label>
                    <div className="flex flex-wrap gap-2">
                      {conditions.map((cond) => (
                        <button
                          key={cond.value}
                          onClick={() => setLocalFilters((p) => ({ ...p, condition: cond.value }))}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                            localFilters.condition === cond.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {cond.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Preço (SwapCoins)</Label>
                      <span className="text-sm text-muted-foreground">
                        {localFilters.minPrice !== null || localFilters.maxPrice !== null
                          ? `${(localFilters.minPrice ?? 0).toLocaleString()} - ${(localFilters.maxPrice ?? 50000).toLocaleString()} SC`
                          : "Sem limite"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[localFilters.minPrice ?? 0, localFilters.maxPrice ?? 50000]}
                        onValueChange={([min, max]) =>
                          setLocalFilters((p) => ({ ...p, minPrice: min, maxPrice: max }))
                        }
                        min={0}
                        max={50000}
                        step={500}
                        className="flex-1"
                      />
                      {(localFilters.minPrice !== null || localFilters.maxPrice !== null) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setLocalFilters((p) => ({ ...p, minPrice: null, maxPrice: null }))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {localFilters.minPrice === null && localFilters.maxPrice === null && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocalFilters((p) => ({ ...p, minPrice: 0, maxPrice: 10000 }))}
                      >
                        Ativar filtro de preço
                      </Button>
                    )}
                  </div>
                </div>

                <SheetFooter className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleResetFilters} className="flex-1">
                    Limpar
                  </Button>
                  <Button onClick={handleApplyFilters} className="flex-1">
                    Aplicar
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-12 w-12 rounded-xl", viewMode === "grid" && "bg-muted")}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-12 w-12 rounded-xl", viewMode === "list" && "bg-muted")}
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category}
              </button>
            ))}
          </motion.div>

          {/* Active Filters Summary */}
          {(activeFilterCount > 0 || sortBy !== "recent") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-2 mb-6"
            >
              {filters.condition !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {conditions.find(c => c.value === filters.condition)?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(p => ({ ...p, condition: "all" }))} />
                </Badge>
              )}
              {(filters.minPrice !== null || filters.maxPrice !== null) && (
                <Badge variant="secondary" className="gap-1">
                  {(filters.minPrice ?? 0).toLocaleString()} - {(filters.maxPrice ?? 50000).toLocaleString()} SC
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(p => ({ ...p, minPrice: null, maxPrice: null }))} />
                </Badge>
              )}
              {sortBy !== "recent" && (
                <Badge variant="secondary" className="gap-1">
                  {sortOptions.find(s => s.value === sortBy)?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSortBy("recent")} />
                </Badge>
              )}
              <button
                onClick={handleClearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
              >
                Limpar tudo
              </button>
            </motion.div>
          )}

          {/* Results Count */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground mb-6"
          >
            {filteredAndSortedProducts.length} resultados encontrados
          </motion.p>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">A carregar anúncios...</p>
            </div>
          )}

          {/* Products Grid */}
          {!loading && (
            <div className={cn(
              "grid gap-6",
              viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}>
              {filteredAndSortedProducts.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * Math.min(index, 10) }}
                >
                  <Link to={`/product/${listing.id}`}>
                    <ProductCard
                      id={listing.id}
                      name={listing.title}
                      price={listing.price_swap_coins || 0}
                      image={listing.images?.[0] || "/placeholder.svg"}
                      seller={listing.seller?.username || listing.seller?.full_name || "Vendedor"}
                      condition={listing.condition as "novo" | "usado" | "como novo"}
                      category={listing.category}
                      isBoosted={!!listing.boost_expires_at && listing.boost_expires_at > new Date().toISOString()}
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && filteredAndSortedProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Marketplace;
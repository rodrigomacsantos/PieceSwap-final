import { MapPin, Navigation, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNavigate } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

export const NearbyUsers = () => {
  const { 
    latitude, 
    longitude, 
    cityName,
    loading, 
    error, 
    nearbyUsers, 
    loadingNearby,
    requestLocation, 
    fetchNearbyUsers 
  } = useGeolocation();
  const navigate = useNavigate();
  const [radius, setRadius] = useState(50);

  const handleRadiusChange = (value: number[]) => {
    setRadius(value[0]);
    if (latitude && longitude) {
      fetchNearbyUsers(value[0]);
    }
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  if (!latitude || !longitude) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Utilizadores Próximos</CardTitle>
          <CardDescription>
            Ative a sua localização para descobrir utilizadores perto de si
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={requestLocation} 
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {loading ? 'A obter localização...' : 'Ativar Localização'}
          </Button>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Utilizadores Próximos
              {cityName && <span className="text-muted-foreground font-normal">(em {cityName})</span>}
            </CardTitle>
            <CardDescription>
              {nearbyUsers.length} utilizador{nearbyUsers.length !== 1 ? 'es' : ''} num raio de {radius}km
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Navigation className="h-3 w-3" />
            Localização ativa
          </Badge>
        </div>
        <div className="pt-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Raio de pesquisa</span>
            <span className="font-medium text-foreground">{radius}km</span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={handleRadiusChange}
            min={5}
            max={200}
            step={5}
            className="w-full"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loadingNearby ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : nearbyUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum utilizador encontrado nesta área</p>
            <p className="text-sm">Tente aumentar o raio de pesquisa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyUsers.map((nearbyUser) => (
              <div
                key={nearbyUser.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/profile/${nearbyUser.id}`)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={nearbyUser.avatar_url || ''} />
                  <AvatarFallback>
                    {nearbyUser.username?.[0]?.toUpperCase() || nearbyUser.full_name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {nearbyUser.full_name || nearbyUser.username || 'Utilizador'}
                  </p>
                  {nearbyUser.location && (
                    <p className="text-sm text-muted-foreground truncate">
                      {nearbyUser.location}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="gap-1 shrink-0">
                  <MapPin className="h-3 w-3" />
                  {formatDistance(nearbyUser.distance_km)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

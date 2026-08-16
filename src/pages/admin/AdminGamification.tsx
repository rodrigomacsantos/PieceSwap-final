import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Target, Plus, Edit2, Trash2, Loader2, Users, Star, Flame } from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import { toast } from "sonner";
import { format } from "date-fns";

const AdminGamification = () => {
  const [badges, setBadges] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalBadgesEarned: 0, avgLevel: 0, activeStreaks: 0 });
  const [loading, setLoading] = useState(true);
  const [badgeDialog, setBadgeDialog] = useState(false);
  const [challengeDialog, setChallengeDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);

  const [badgeForm, setBadgeForm] = useState({
    key: '', name: '', description: '', icon: 'trophy', category: 'general',
    requirement_type: 'listings_created', requirement_value: 1, xp_reward: 25, swapcoins_reward: 10, is_active: true,
  });

  const [challengeForm, setChallengeForm] = useState({
    title: '', description: '', challenge_type: 'listings_created', target_value: 1,
    xp_reward: 50, swapcoins_reward: 20, starts_at: '', ends_at: '', is_active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    const [badgesRes, challengesRes, userBadgesRes, xpRes] = await Promise.all([
      supabase.from('badges').select('*').order('category'),
      supabase.from('weekly_challenges').select('*').order('created_at', { ascending: false }),
      supabase.from('user_badges').select('id'),
      supabase.from('user_xp').select('level'),
    ]);

    setBadges(badgesRes.data || []);
    setChallenges(challengesRes.data || []);

    const totalBadgesEarned = userBadgesRes.data?.length || 0;
    const levels = (xpRes.data || []).map((x: any) => x.level);
    const avgLevel = levels.length > 0 ? Math.round(levels.reduce((a: number, b: number) => a + b, 0) / levels.length * 10) / 10 : 0;

    setStats({ totalBadgesEarned, avgLevel, activeStreaks: 0 });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveBadge = async () => {
    const payload = { ...badgeForm };
    let error;
    if (editingBadge) {
      ({ error } = await supabase.from('badges').update(payload).eq('id', editingBadge.id));
    } else {
      ({ error } = await supabase.from('badges').insert(payload));
    }
    if (error) { toast.error('Erro ao guardar badge'); return; }
    toast.success(editingBadge ? 'Badge atualizado!' : 'Badge criado!');
    setBadgeDialog(false);
    setEditingBadge(null);
    fetchData();
  };

  const handleDeleteBadge = async (id: string) => {
    const { error } = await supabase.from('badges').delete().eq('id', id);
    if (error) { toast.error('Erro ao eliminar'); return; }
    toast.success('Badge eliminado');
    fetchData();
  };

  const handleSaveChallenge = async () => {
    const payload = { ...challengeForm };
    let error;
    if (editingChallenge) {
      ({ error } = await supabase.from('weekly_challenges').update(payload).eq('id', editingChallenge.id));
    } else {
      ({ error } = await supabase.from('weekly_challenges').insert(payload));
    }
    if (error) { toast.error('Erro ao guardar desafio'); return; }
    toast.success(editingChallenge ? 'Desafio atualizado!' : 'Desafio criado!');
    setChallengeDialog(false);
    setEditingChallenge(null);
    fetchData();
  };

  const handleDeleteChallenge = async (id: string) => {
    const { error } = await supabase.from('weekly_challenges').delete().eq('id', id);
    if (error) { toast.error('Erro ao eliminar'); return; }
    toast.success('Desafio eliminado');
    fetchData();
  };

  const openEditBadge = (badge: any) => {
    setBadgeForm({
      key: badge.key, name: badge.name, description: badge.description, icon: badge.icon,
      category: badge.category, requirement_type: badge.requirement_type, requirement_value: badge.requirement_value,
      xp_reward: badge.xp_reward, swapcoins_reward: badge.swapcoins_reward, is_active: badge.is_active,
    });
    setEditingBadge(badge);
    setBadgeDialog(true);
  };

  const openEditChallenge = (ch: any) => {
    setChallengeForm({
      title: ch.title, description: ch.description, challenge_type: ch.challenge_type,
      target_value: ch.target_value, xp_reward: ch.xp_reward, swapcoins_reward: ch.swapcoins_reward,
      starts_at: ch.starts_at?.slice(0, 16) || '', ends_at: ch.ends_at?.slice(0, 16) || '', is_active: ch.is_active,
    });
    setEditingChallenge(ch);
    setChallengeDialog(true);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gamificação</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Badges Atribuídos" value={stats.totalBadgesEarned} icon={Trophy} />
        <StatCard title="Nível Médio" value={stats.avgLevel} icon={Star} />
        <StatCard title="Badges Disponíveis" value={badges.length} icon={Target} />
      </div>

      <Tabs defaultValue="badges">
        <TabsList>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="challenges">Desafios</TabsTrigger>
        </TabsList>

        <TabsContent value="badges" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingBadge(null); setBadgeForm({ key: '', name: '', description: '', icon: 'trophy', category: 'general', requirement_type: 'listings_created', requirement_value: 1, xp_reward: 25, swapcoins_reward: 10, is_active: true }); setBadgeDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Badge
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Requisito</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>SC</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {badges.map(badge => (
                    <TableRow key={badge.id}>
                      <TableCell className="font-medium">{badge.name}</TableCell>
                      <TableCell><Badge variant="outline">{badge.category}</Badge></TableCell>
                      <TableCell>{badge.requirement_type} ≥ {badge.requirement_value}</TableCell>
                      <TableCell>{badge.xp_reward}</TableCell>
                      <TableCell>{badge.swapcoins_reward}</TableCell>
                      <TableCell>
                        <Badge variant={badge.is_active ? "default" : "secondary"}>
                          {badge.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditBadge(badge)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBadge(badge.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingChallenge(null); setChallengeForm({ title: '', description: '', challenge_type: 'listings_created', target_value: 1, xp_reward: 50, swapcoins_reward: 20, starts_at: '', ends_at: '', is_active: true }); setChallengeDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Desafio
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Recompensa</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges.map(ch => (
                    <TableRow key={ch.id}>
                      <TableCell className="font-medium">{ch.title}</TableCell>
                      <TableCell><Badge variant="outline">{ch.challenge_type}</Badge></TableCell>
                      <TableCell>{ch.target_value}</TableCell>
                      <TableCell>{ch.xp_reward} XP + {ch.swapcoins_reward} SC</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(ch.starts_at), 'dd/MM')} - {format(new Date(ch.ends_at), 'dd/MM')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ch.is_active ? "default" : "secondary"}>
                          {ch.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditChallenge(ch)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteChallenge(ch.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {challenges.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum desafio criado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Badge Dialog */}
      <Dialog open={badgeDialog} onOpenChange={setBadgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBadge ? 'Editar Badge' : 'Novo Badge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Key</Label><Input value={badgeForm.key} onChange={e => setBadgeForm(p => ({ ...p, key: e.target.value }))} /></div>
              <div><Label>Nome</Label><Input value={badgeForm.name} onChange={e => setBadgeForm(p => ({ ...p, name: e.target.value }))} /></div>
            </div>
            <div><Label>Descrição</Label><Textarea value={badgeForm.description} onChange={e => setBadgeForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Categoria</Label><Input value={badgeForm.category} onChange={e => setBadgeForm(p => ({ ...p, category: e.target.value }))} /></div>
              <div><Label>Ícone</Label><Input value={badgeForm.icon} onChange={e => setBadgeForm(p => ({ ...p, icon: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo Requisito</Label><Input value={badgeForm.requirement_type} onChange={e => setBadgeForm(p => ({ ...p, requirement_type: e.target.value }))} /></div>
              <div><Label>Valor Requisito</Label><Input type="number" value={badgeForm.requirement_value} onChange={e => setBadgeForm(p => ({ ...p, requirement_value: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>XP Recompensa</Label><Input type="number" value={badgeForm.xp_reward} onChange={e => setBadgeForm(p => ({ ...p, xp_reward: Number(e.target.value) }))} /></div>
              <div><Label>SC Recompensa</Label><Input type="number" value={badgeForm.swapcoins_reward} onChange={e => setBadgeForm(p => ({ ...p, swapcoins_reward: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={badgeForm.is_active} onCheckedChange={v => setBadgeForm(p => ({ ...p, is_active: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button onClick={handleSaveBadge} className="w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Dialog */}
      <Dialog open={challengeDialog} onOpenChange={setChallengeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChallenge ? 'Editar Desafio' : 'Novo Desafio'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={challengeForm.title} onChange={e => setChallengeForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={challengeForm.description} onChange={e => setChallengeForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tipo</Label><Input value={challengeForm.challenge_type} onChange={e => setChallengeForm(p => ({ ...p, challenge_type: e.target.value }))} /></div>
              <div><Label>Meta</Label><Input type="number" value={challengeForm.target_value} onChange={e => setChallengeForm(p => ({ ...p, target_value: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>XP Recompensa</Label><Input type="number" value={challengeForm.xp_reward} onChange={e => setChallengeForm(p => ({ ...p, xp_reward: Number(e.target.value) }))} /></div>
              <div><Label>SC Recompensa</Label><Input type="number" value={challengeForm.swapcoins_reward} onChange={e => setChallengeForm(p => ({ ...p, swapcoins_reward: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Início</Label><Input type="datetime-local" value={challengeForm.starts_at} onChange={e => setChallengeForm(p => ({ ...p, starts_at: e.target.value }))} /></div>
              <div><Label>Fim</Label><Input type="datetime-local" value={challengeForm.ends_at} onChange={e => setChallengeForm(p => ({ ...p, ends_at: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={challengeForm.is_active} onCheckedChange={v => setChallengeForm(p => ({ ...p, is_active: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button onClick={handleSaveChallenge} className="w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGamification;

import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Send,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "overview" | "queue" | "settings";
type Lead = {
  id: number;
  businessName: string;
  category: string | null;
  city: string;
  websiteUrl: string | null;
  gbpUrl: string | null;
  contactUrl: string | null;
  status: string;
  batchId: number;
  createdAt: Date | string;
};

type Detail = {
  lead: Lead;
  finding: {
    issueType: string;
    severity: string;
    headline: string;
    evidence: string;
    recommendation: string;
    estimatedImpact: string | null;
    sourceUrls: string | null;
    verifiedAt: Date | string;
    profileAnalysis: string | null;
    missingInfo: string | null;
    profileAnalyzedAt: Date | string | null;
  } | null;
  draft: {
    price: number;
    subject: string;
    body: string;
    videoScript: string;
    paymentCta: string;
    status: string;
  } | null;
};

const issueLabels: Record<string, string> = {
  google_business_profile: "Google profile",
  link_in_bio: "Link-in-bio",
  mobile_checkout: "Mobile checkout",
  website_conversion: "Website conversion",
  other: "Other",
};

const severityStyles: Record<string, string> = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initials(name?: string | null) {
  return (name || "You").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<View>("overview");
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const dashboard = trpc.workspace.dashboard.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const queue = trpc.workspace.leads.useQuery(undefined, { enabled: Boolean(user), refetchOnWindowFocus: false });
  const detailQuery = trpc.workspace.leadDetail.useQuery(
    { leadId: selectedLead ?? 0 },
    { enabled: Boolean(user && selectedLead), refetchOnWindowFocus: false },
  );
  const setDraftStatus = trpc.workspace.setDraftStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([dashboard.refetch(), queue.refetch(), detailQuery.refetch()]);
      toast.success("Review status updated");
    },
    onError: error => toast.error(error.message),
  });
  const analyzeProfile = trpc.workspace.analyzeGoogleProfile.useMutation({
    onSuccess: async () => {
      await Promise.all([dashboard.refetch(), queue.refetch(), detailQuery.refetch()]);
      toast.success("Google Business Profile analysis saved");
    },
    onError: error => toast.error(error.message),
  });

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  const settings = dashboard.data?.settings;
  const metrics = dashboard.data?.metrics ?? { totalLeads: 0, ready: 0, approved: 0, batches: 0 };
  const leads = (queue.data ?? []) as Lead[];
  const detail = detailQuery.data as Detail | null | undefined;

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#15231f]">
      <div className="flex min-h-screen">
        <aside className={`${sidebarOpen ? "w-[258px]" : "w-[76px]"} hidden shrink-0 flex-col border-r border-[#dfe7e1] bg-[#10231e] text-white transition-all duration-200 md:flex`}>
          <div className="flex h-[88px] items-center gap-3 px-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#d8f36b] text-[#10231e]"><Target className="h-5 w-5" /></div>
            {sidebarOpen && <div><div className="text-[15px] font-semibold tracking-tight">Sprintboard</div><div className="text-xs text-[#a8bbb2]">Houston lead engine</div></div>}
          </div>
          <div className="px-3 pt-5">
            {[
              { id: "overview" as View, label: "Command center", icon: LayoutDashboard },
              { id: "queue" as View, label: "Review queue", icon: Clipboard },
              { id: "settings" as View, label: "Sprint settings", icon: Settings2 },
            ].map(item => {
              const active = view === item.id;
              return <button key={item.id} onClick={() => setView(item.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-[#d8f36b] font-semibold text-[#10231e]" : "text-[#b8c9c2] hover:bg-white/10 hover:text-white"}`}>
                <item.icon className="h-[18px] w-[18px] shrink-0" />{sidebarOpen && <span>{item.label}</span>}
              </button>;
            })}
          </div>
          {sidebarOpen && <div className="mt-auto p-4"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[#a8bbb2]"><Zap className="h-3.5 w-3.5 text-[#d8f36b]" /> Sprint pulse</div><div className="text-2xl font-semibold">{metrics.ready}<span className="ml-1 text-sm font-normal text-[#a8bbb2]">leads to review</span></div><div className="mt-2 text-xs leading-5 text-[#a8bbb2]">Twice-weekly batches are prepared for your approval.</div></div></div>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="m-4 flex items-center justify-center rounded-xl border border-white/10 p-2 text-[#a8bbb2] hover:bg-white/10 hover:text-white" aria-label="Toggle sidebar">{sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}</button>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[88px] items-center justify-between border-b border-[#dfe7e1]/80 bg-[#f7f8f5]/90 px-5 backdrop-blur md:px-9">
            <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-[#e8eee8] md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu className="h-5 w-5" /></button><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#789087]">Local business digital sprints</div><h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{view === "overview" ? "Command center" : view === "queue" ? "Review queue" : "Sprint settings"}</h1></div></div>
            <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><div className="text-sm font-medium">{user.name || "Your workspace"}</div><div className="text-xs text-[#789087]">Houston, Texas</div></div><div className="grid h-9 w-9 place-items-center rounded-full bg-[#dce8df] text-xs font-semibold text-[#36544a]">{initials(user.name)}</div><button onClick={() => logout()} className="hidden rounded-lg p-2 text-[#789087] hover:bg-[#e8eee8] hover:text-[#15231f] sm:block" title="Sign out"><LogOut className="h-4 w-4" /></button></div>
          </header>

          <div className="mx-auto max-w-[1440px] p-5 md:p-9">
            {view === "overview" && <Overview settings={settings} metrics={metrics} leads={leads} batches={dashboard.data?.batches ?? []} onOpenLead={setSelectedLead} onReview={() => setView("queue")} />}
            {view === "queue" && <Queue leads={leads} selectedLead={selectedLead} onOpenLead={setSelectedLead} onReview={() => setView("queue")} />}
            {view === "settings" && <SettingsPanel settings={settings} onSaved={async () => { await dashboard.refetch(); toast.success("Sprint settings saved"); }} />}
          </div>
        </main>
      </div>

      {selectedLead && <LeadDrawer detail={detail} loading={detailQuery.isLoading} onClose={() => setSelectedLead(null)} onStatus={(status) => setDraftStatus.mutate({ leadId: selectedLead, status })} pending={setDraftStatus.isPending} onAnalyze={() => analyzeProfile.mutate({ leadId: selectedLead })} analyzing={analyzeProfile.isPending} />}
    </div>
  );
}

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-[#f7f8f5]"><div className="flex items-center gap-3 text-sm text-[#789087]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#9bbd42]" />Loading sprintboard…</div></div>;
}

function LoginScreen() {
  return <div className="grid min-h-screen place-items-center bg-[#10231e] p-6 text-white"><div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-2xl"><div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#d8f36b] text-[#10231e]"><Target className="h-6 w-6" /></div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a8bbb2]">Houston local audit sprints</div><h1 className="mt-3 text-3xl font-semibold tracking-tight">Turn sharp observations into paid fixes.</h1><p className="mt-4 leading-7 text-[#b8c9c2]">Your private workspace for researching local businesses, packaging a three-minute audit, and reviewing outreach before it leaves your hands.</p><Button onClick={() => startLogin()} className="mt-8 h-12 w-full rounded-xl bg-[#d8f36b] font-semibold text-[#10231e] hover:bg-[#c9e95c]">Sign in to your sprintboard <ArrowUpRight className="ml-2 h-4 w-4" /></Button><p className="mt-4 text-center text-xs text-[#7f9990]">No outreach is sent automatically.</p></div></div>;
}

function Overview({ settings, metrics, leads, batches, onOpenLead, onReview }: { settings?: any; metrics: { totalLeads: number; ready: number; approved: number; batches: number }; leads: Lead[]; batches: any[]; onOpenLead: (id: number) => void; onReview: () => void }) {
  const recentLeads = leads.slice(0, 5);
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-[28px] bg-[#d8f36b] p-7 md:p-9"><div className="relative z-[1] max-w-2xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#10231e]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#365225]"><Sparkles className="h-3.5 w-3.5" /> Cash-flow sprint mode</div><h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#10231e] md:text-4xl">Find the one digital leak a Houston business will pay to close.</h2><p className="mt-4 max-w-xl text-[15px] leading-7 text-[#365225]">Each batch turns public evidence into a concise audit, a three-minute recording kit, and a ready-to-review $150–$300 fix offer.</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={onReview} className="rounded-xl bg-[#10231e] text-white hover:bg-[#1d392f]">Open review queue <ArrowUpRight className="ml-2 h-4 w-4" /></Button><div className="flex items-center gap-2 rounded-xl bg-white/50 px-4 py-2.5 text-sm font-medium text-[#365225]"><Clock3 className="h-4 w-4" /> {settings?.cadence || "Twice weekly"}</div></div></div><div className="absolute -right-14 -top-20 h-72 w-72 rounded-full border-[36px] border-[#b8d94e]/60" /><div className="absolute -bottom-32 right-20 h-64 w-64 rounded-full border-[20px] border-[#b8d94e]/40" /></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: "Leads in workspace", value: metrics.totalLeads, note: "Across all batches", icon: Users, tone: "bg-[#e5eee7]" },
      { label: "Awaiting review", value: metrics.ready, note: "Your next conversations", icon: Clipboard, tone: "bg-[#fff0c9]" },
      { label: "Approved to send", value: metrics.approved, note: "Reviewed by you", icon: CheckCircle2, tone: "bg-[#e7e3f5]" },
      { label: "Batches completed", value: metrics.batches, note: "Research cycles", icon: Gauge, tone: "bg-[#dcecf2]" },
    ].map(item => <Card key={item.label} className="rounded-2xl border-[#dfe7e1] bg-white shadow-[0_8px_28px_rgba(20,44,34,0.04)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div><div className="text-sm text-[#789087]">{item.label}</div><div className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</div><div className="mt-1 text-xs text-[#9aaea4]">{item.note}</div></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}><item.icon className="h-5 w-5 text-[#36544a]" /></div></div></CardContent></Card>)}
    </section>
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
      <Card className="rounded-2xl border-[#dfe7e1] bg-white shadow-[0_8px_28px_rgba(20,44,34,0.04)]"><CardHeader className="flex flex-row items-center justify-between space-y-0 p-6"><div><CardTitle className="text-lg">Latest lead queue</CardTitle><p className="mt-1 text-sm text-[#789087]">Open a lead to review evidence and the recording kit.</p></div><Button variant="outline" onClick={onReview} className="rounded-lg border-[#cddbd1]">View all <ArrowUpRight className="ml-2 h-4 w-4" /></Button></CardHeader><CardContent className="p-0"><div className="divide-y divide-[#edf1ed]">{recentLeads.length === 0 ? <EmptyState /> : recentLeads.map(lead => <LeadRow key={lead.id} lead={lead} onOpen={() => onOpenLead(lead.id)} />)}</div></CardContent></Card>
      <Card className="rounded-2xl border-[#dfe7e1] bg-[#10231e] text-white shadow-[0_8px_28px_rgba(20,44,34,0.08)]"><CardHeader className="p-6 pb-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d8f36b]"><ShieldCheck className="h-4 w-4" /> Guardrails</div><CardTitle className="mt-3 text-xl text-white">Fast, but trustworthy.</CardTitle></CardHeader><CardContent className="space-y-4 p-6 pt-2 text-sm leading-6 text-[#b8c9c2]"><p><Check className="mr-2 inline h-4 w-4 text-[#d8f36b]" />Every finding stores the source URL and evidence used.</p><p><Check className="mr-2 inline h-4 w-4 text-[#d8f36b]" />Every message stays a draft until you approve it.</p><p><Check className="mr-2 inline h-4 w-4 text-[#d8f36b]" />The agent prepares talking points—not a fake Loom link.</p><Separator className="bg-white/10" /><div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#d8f36b]" /><div><div className="font-medium text-white">{settings?.region || "Houston, Texas"}</div><div className="text-xs text-[#8ea69b]">{settings?.niche || "Local businesses"} · ${settings?.priceLow || 150}–${settings?.priceHigh || 300} sprint offer</div></div></div></CardContent></Card>
    </div>
    <Card className="rounded-2xl border-[#dfe7e1] bg-white shadow-[0_8px_28px_rgba(20,44,34,0.04)]"><CardHeader className="p-6"><CardTitle className="text-lg">Batch history</CardTitle><p className="mt-1 text-sm text-[#789087]">Your twice-weekly research cadence, in one place.</p></CardHeader><CardContent className="p-0"><div className="grid grid-cols-[1fr_1fr_110px_110px] border-y border-[#edf1ed] bg-[#fbfcfa] px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8aa098]"><span>Focus</span><span>Created</span><span>Leads</span><span>Status</span></div>{batches.length === 0 ? <div className="p-6 text-sm text-[#789087]">Your first batch will appear here after the scheduled research run.</div> : batches.slice(0, 5).map(batch => <div key={batch.id} className="grid grid-cols-[1fr_1fr_110px_110px] items-center border-b border-[#edf1ed] px-6 py-4 text-sm"><div className="font-medium">{batch.niche}<div className="text-xs text-[#8aa098]">{batch.region}</div></div><div className="text-[#789087]">{formatDate(batch.createdAt)}</div><div className="text-[#789087]">—</div><Badge className="w-fit border-[#cde1b4] bg-[#eef7df] text-[#4e6f25]">{batch.status}</Badge></div>)}</CardContent></Card>
  </div>;
}

function Queue({ leads, selectedLead, onOpenLead }: { leads: Lead[]; selectedLead: number | null; onOpenLead: (id: number) => void; onReview: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = leads.filter(lead => `${lead.businessName} ${lead.category || ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#789087]"><Clipboard className="h-4 w-4" /> Review before outreach</div><h2 className="text-3xl font-semibold tracking-tight">Ten useful conversations, not ten random contacts.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#789087]">Open each lead, verify the evidence, record the audit, then approve only the offers you are comfortable sending.</p></div><div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a49b]" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search leads…" className="h-11 rounded-xl border-[#dfe7e1] bg-white pl-9" /></div></div><Card className="overflow-hidden rounded-2xl border-[#dfe7e1] bg-white shadow-[0_8px_28px_rgba(20,44,34,0.04)]"><div className="hidden grid-cols-[1.3fr_0.8fr_1fr_0.7fr_100px] gap-4 border-b border-[#edf1ed] bg-[#fbfcfa] px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8aa098] md:grid"><span>Business</span><span>Issue</span><span>Next move</span><span>Status</span><span /></div>{filtered.length === 0 ? <EmptyState /> : filtered.map(lead => <LeadRow key={lead.id} lead={lead} onOpen={() => onOpenLead(lead.id)} dense />)}</Card></div>;
}

function LeadRow({ lead, onOpen, dense = false }: { lead: Lead; onOpen: () => void; dense?: boolean }) {
  return <button onClick={onOpen} className={`grid w-full items-center gap-4 px-6 text-left transition hover:bg-[#f8faf7] ${dense ? "py-5 md:grid-cols-[1.3fr_0.8fr_1fr_0.7fr_100px]" : "py-5 md:grid-cols-[1.2fr_0.8fr_1fr_0.75fr_24px]"}`}><div className="min-w-0"><div className="truncate font-semibold text-[#203a31]">{lead.businessName}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-[#8aa098]"><MapPin className="h-3 w-3" />{lead.city}{lead.category ? <><span>·</span>{lead.category}</> : null}</div></div><div className="hidden md:block"><span className="rounded-full bg-[#edf5ec] px-2.5 py-1 text-xs font-medium text-[#55735f]">Audit ready</span></div><div className="hidden text-sm text-[#526c60] md:block">Open evidence + recording kit</div><div><span className="rounded-full border border-[#e4e9df] bg-[#fbfcfa] px-2.5 py-1 text-xs capitalize text-[#789087]">{lead.status}</span></div><ArrowUpRight className="hidden h-4 w-4 text-[#94a79e] md:block" /></button>;
}

function EmptyState() {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf5ec]"><Search className="h-5 w-5 text-[#6d8f76]" /></div><div className="mt-4 font-medium">No leads yet</div><p className="mt-1 max-w-sm text-sm leading-6 text-[#789087]">Your first research batch will populate this queue with public evidence and review-ready offers.</p></div>;
}

function LeadDrawer({ detail, loading, onClose, onStatus, pending, onAnalyze, analyzing }: { detail?: Detail | null; loading: boolean; onClose: () => void; onStatus: (status: "approved" | "rejected" | "draft") => void; pending: boolean; onAnalyze: () => void; analyzing: boolean }) {
  let profileSummary: { summary: string; priority: string; recommendedFix: string } | null = null;
  let missingInfo: string[] = [];
  if (detail?.finding?.profileAnalysis) { try { profileSummary = JSON.parse(detail.finding.profileAnalysis); } catch {} }
  if (detail?.finding?.missingInfo) { try { missingInfo = JSON.parse(detail.finding.missingInfo); } catch {} }
  return <div className="fixed inset-0 z-30 flex justify-end bg-[#10231e]/25 backdrop-blur-[2px]" onClick={onClose}><div onClick={e => e.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto bg-[#f7f8f5] shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dfe7e1] bg-[#f7f8f5]/95 px-6 py-5 backdrop-blur"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#789087]">Lead review</div><div className="mt-1 text-lg font-semibold">{loading ? "Loading audit…" : detail?.lead.businessName || "Lead"}</div></div><button onClick={onClose} className="rounded-lg p-2 text-[#789087] hover:bg-[#e7eee8]"><X className="h-5 w-5" /></button></div>{loading ? <div className="p-8 text-sm text-[#789087]">Loading evidence and outreach kit…</div> : detail ? <div className="space-y-5 p-6"><div className="flex flex-wrap items-center gap-2"><Badge className="border-[#dfe7e1] bg-white text-[#55735f]">{detail.lead.city}</Badge>{detail.lead.category && <Badge className="border-[#dfe7e1] bg-white text-[#55735f]">{detail.lead.category}</Badge>}{detail.finding && <Badge className={severityStyles[detail.finding.severity] || severityStyles.medium}>{detail.finding.severity} priority</Badge>}</div><Card className="rounded-2xl border-[#dfe7e1] bg-white"><CardHeader className="p-5 pb-3"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#789087]">The one glaring flaw</div><CardTitle className="mt-2 text-xl leading-7">{detail.finding?.headline || "Finding pending"}</CardTitle></CardHeader><CardContent className="space-y-4 p-5 pt-2"><div><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8aa098]">Evidence</div><p className="mt-2 text-sm leading-6 text-[#526c60]">{detail.finding?.evidence}</p></div><div><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8aa098]">Recommended fix</div><p className="mt-2 text-sm leading-6 text-[#526c60]">{detail.finding?.recommendation}</p></div>{detail.finding?.estimatedImpact && <div className="rounded-xl bg-[#eef7df] p-3 text-sm leading-6 text-[#4e6f25]"><span className="font-semibold">Why it matters: </span>{detail.finding.estimatedImpact}</div>}<div className="flex flex-wrap gap-2 pt-1">{detail.lead.websiteUrl && <a href={detail.lead.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#55735f] hover:underline">Website <ExternalLink className="h-3 w-3" /></a>}{detail.lead.gbpUrl && <a href={detail.lead.gbpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#55735f] hover:underline">Google profile <ExternalLink className="h-3 w-3" /></a>}</div></CardContent></Card>{detail.lead.gbpUrl && <Card className="rounded-2xl border-[#d4e5b5] bg-[#f5fae9]"><CardHeader className="p-5 pb-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#64813a]"><Globe2 className="h-4 w-4" /> AI Google Profile check</div><CardTitle className="mt-2 text-lg">Find missing profile information before you record.</CardTitle></CardHeader><CardContent className="p-5 pt-2">{profileSummary ? <div className="space-y-3"><p className="text-sm leading-6 text-[#526c60]">{profileSummary.summary}</p>{missingInfo.length > 0 && <div><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#789087]">Missing or unclear fields</div><ul className="mt-2 space-y-1.5 text-sm text-[#526c60]">{missingInfo.map((item, index) => <li key={index} className="flex gap-2"><span className="text-[#8eaf43]">•</span>{item}</li>)}</ul></div>}<div className="rounded-xl bg-white/75 p-3 text-sm leading-6 text-[#4e6f25]"><span className="font-semibold">Best next action: </span>{profileSummary.recommendedFix}</div><div className="text-xs text-[#789087]">Priority: <span className="font-semibold capitalize">{profileSummary.priority}</span>{detail.finding?.profileAnalyzedAt ? ` · analyzed ${formatDate(detail.finding.profileAnalyzedAt)}` : ""}</div></div> : <div className="flex flex-col items-start gap-3"><p className="text-sm leading-6 text-[#55735f]">The server will inspect the public profile snapshot when available and use the existing audit evidence when Google serves a dynamic page.</p><Button disabled={analyzing} onClick={onAnalyze} className="rounded-lg bg-[#10231e] text-white hover:bg-[#1d392f]"><RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />{analyzing ? "Analyzing profile…" : "Analyze Google Profile"}</Button></div>}</CardContent></Card>}<Card className="rounded-2xl border-[#dfe7e1] bg-white"><CardHeader className="p-5 pb-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#789087]"><MessageSquareText className="h-4 w-4" /> Three-minute recording kit</div><CardTitle className="mt-2 text-lg">Record this, then send the free audit.</CardTitle></CardHeader><CardContent className="p-5 pt-2"><div className="whitespace-pre-wrap rounded-xl bg-[#f6f8f4] p-4 text-sm leading-6 text-[#526c60]">{detail.draft?.videoScript}</div><Button variant="outline" onClick={() => { navigator.clipboard?.writeText(detail.draft?.videoScript || ""); toast.success("Recording script copied"); }} className="mt-3 rounded-lg border-[#cddbd1]"><Clipboard className="mr-2 h-4 w-4" /> Copy script</Button></CardContent></Card><Card className="rounded-2xl border-[#dfe7e1] bg-white"><CardHeader className="p-5 pb-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#789087]"><Send className="h-4 w-4" /> Outreach draft</div><CardTitle className="mt-2 text-lg">{detail.draft?.subject}</CardTitle></CardHeader><CardContent className="p-5 pt-2"><div className="whitespace-pre-wrap text-sm leading-6 text-[#526c60]">{detail.draft?.body}</div><div className="mt-4 rounded-xl border border-[#d8e8bb] bg-[#f3f9e7] p-4 text-sm leading-6 text-[#4e6f25]"><span className="font-semibold">Payment CTA: </span>{detail.draft?.paymentCta}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ed] pt-4"><div className="text-xs text-[#8aa098]">Suggested sprint price: <span className="font-semibold text-[#526c60]">${detail.draft?.price}</span></div><div className="flex gap-2">{detail.draft?.status === "approved" ? <Badge className="border-[#cde1b4] bg-[#eef7df] px-3 py-1.5 text-[#4e6f25]"><Check className="mr-1.5 h-3.5 w-3.5" /> Approved</Badge> : <><Button variant="outline" disabled={pending} onClick={() => onStatus("rejected")} className="rounded-lg border-[#efcaca] text-[#b04f4f] hover:bg-[#fff4f4]"><X className="mr-1.5 h-4 w-4" /> Not a fit</Button><Button disabled={pending} onClick={() => onStatus("approved")} className="rounded-lg bg-[#10231e] text-white hover:bg-[#1d392f]"><Check className="mr-1.5 h-4 w-4" /> Approve to send</Button></>}</div></div></CardContent></Card><div className="flex items-start gap-3 rounded-xl border border-[#dfe7e1] bg-white p-4 text-xs leading-5 text-[#789087]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6d8f76]" /><span>Approval only marks this draft as ready. This workspace does not send messages or create a Loom link for you.</span></div></div> : <div className="p-8 text-sm text-[#789087]">This lead is no longer available.</div>}</div></div>;
}

function SettingsPanel({ settings, onSaved }: { settings?: any; onSaved: () => Promise<void> }) {
  const update = trpc.workspace.updateSettings.useMutation({ onSuccess: onSaved, onError: error => toast.error(error.message) });
  const [form, setForm] = useState({ region: "Houston, Texas", niche: "local businesses", batchSize: 10, cadence: "Twice weekly", priceLow: 150, priceHigh: 300 });
  useEffect(() => { if (settings) setForm({ region: settings.region, niche: settings.niche, batchSize: settings.batchSize, cadence: settings.cadence, priceLow: settings.priceLow, priceHigh: settings.priceHigh }); }, [settings]);
  const set = (key: keyof typeof form, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));
  return <div className="grid gap-6 xl:grid-cols-[1fr_0.72fr]"><Card className="rounded-2xl border-[#dfe7e1] bg-white shadow-[0_8px_28px_rgba(20,44,34,0.04)]"><CardHeader className="p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#789087]"><Settings2 className="h-4 w-4" /> Workspace defaults</div><CardTitle className="mt-3 text-2xl">Tune the sprint without changing the play.</CardTitle><p className="mt-2 max-w-xl text-sm leading-6 text-[#789087]">These settings guide the twice-weekly research agent. Outreach remains approval-gated.</p></CardHeader><CardContent className="grid gap-5 p-6 pt-0 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Target region</Label><Input value={form.region} onChange={e => set("region", e.target.value)} className="h-11 rounded-xl border-[#dfe7e1]" /></div><div className="space-y-2 sm:col-span-2"><Label>Priority niche</Label><Input value={form.niche} onChange={e => set("niche", e.target.value)} className="h-11 rounded-xl border-[#dfe7e1]" /></div><div className="space-y-2"><Label>Businesses per batch</Label><Input type="number" min={5} max={25} value={form.batchSize} onChange={e => set("batchSize", Number(e.target.value))} className="h-11 rounded-xl border-[#dfe7e1]" /></div><div className="space-y-2"><Label>Cadence</Label><Input value={form.cadence} onChange={e => set("cadence", e.target.value)} className="h-11 rounded-xl border-[#dfe7e1]" /></div><div className="space-y-2"><Label>Minimum offer ($)</Label><Input type="number" min={50} value={form.priceLow} onChange={e => set("priceLow", Number(e.target.value))} className="h-11 rounded-xl border-[#dfe7e1]" /></div><div className="space-y-2"><Label>Maximum offer ($)</Label><Input type="number" min={50} value={form.priceHigh} onChange={e => set("priceHigh", Number(e.target.value))} className="h-11 rounded-xl border-[#dfe7e1]" /></div><div className="sm:col-span-2"><Button disabled={update.isPending} onClick={() => update.mutate(form)} className="rounded-xl bg-[#10231e] text-white hover:bg-[#1d392f]">{update.isPending ? "Saving…" : "Save sprint settings"}</Button></div></CardContent></Card><div className="space-y-6"><Card className="rounded-2xl border-[#dfe7e1] bg-[#e8f2ea]"><CardContent className="p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#55735f]"><Clock3 className="h-4 w-4" /> Research cadence</div><div className="mt-4 text-2xl font-semibold text-[#203a31]">Twice weekly</div><p className="mt-2 text-sm leading-6 text-[#55735f]">The agent prepares a fresh batch of ten public-business audits twice per week. The exact run schedule is activated after the workspace is published.</p><div className="mt-5 flex items-center gap-2 text-xs font-medium text-[#55735f]"><CheckCircle2 className="h-4 w-4" /> Approval required before outreach</div></CardContent></Card><Card className="rounded-2xl border-[#dfe7e1] bg-white"><CardContent className="p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#789087]"><FileText className="h-4 w-4" /> What each batch contains</div><ul className="mt-4 space-y-3 text-sm leading-6 text-[#526c60]"><li><span className="mr-2 text-[#9bbd42]">01</span> Verified public evidence and source URLs</li><li><span className="mr-2 text-[#9bbd42]">02</span> One high-leverage issue, not a generic checklist</li><li><span className="mr-2 text-[#9bbd42]">03</span> A three-minute audit talking-point script</li><li><span className="mr-2 text-[#9bbd42]">04</span> A $150–$300 48-hour fix offer draft</li></ul></CardContent></Card></div></div>;
}

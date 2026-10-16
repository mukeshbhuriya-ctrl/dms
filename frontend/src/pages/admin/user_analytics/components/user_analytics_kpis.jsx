import React from "react";
import { Users, UserCheck, Activity, UserX, Clock, ArrowRight, ShieldAlert, LogIn, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fmt = new Intl.NumberFormat("en-IN");

export default function UserAnalyticsKpis({
  kpis = {},
  onNavigateToLogins,
  onNavigateToProductivity,
  onNavigateToInactivity,
}) {
  const {
    totalRegistered = 0,
    activeAccounts = 0,
    deactivatedAccounts = 0,
    loggedInUsers = 0,
    actuallyActiveUsers = 0,
    passiveUsers = 0,
    dormantUsers = 0,
    totalSuccessfulLogins = 0,
    totalFailedLogins = 0,
    loginRate = 0,
    activeRate = 0,
    passiveRate = 0,
    dormantRate = 0,
  } = kpis;

  return (
    <div className="space-y-3">
      {/* ── 5 Primary Engagement Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Total Registered */}
        <Card
          onClick={() => onNavigateToProductivity?.("ALL")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-slate-400 hover:bg-slate-50/40 bg-white"
          title="Click to view all registered users in ledger"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Registered
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {fmt.format(totalRegistered)}
              </p>
              <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 bg-slate-50">
                {activeAccounts} active
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <span>View user directory</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* 2. Logged-In Users (Presence) */}
        <Card
          onClick={() => onNavigateToLogins?.("SUCCESS")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 bg-white"
          title="Click to view successful login records"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Logged-In Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <LogIn className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <p className="text-2xl font-black text-blue-700 tracking-tight">
                {fmt.format(loggedInUsers)}
              </p>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-bold">
                {loginRate}% of total
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <span>View login activity</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* 3. Active Working Users (Logged in + Modified Records) */}
        <Card
          onClick={() => onNavigateToProductivity?.("ACTIVE")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 bg-white"
          title="Click to filter active working users in ledger"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Active Working Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <p className="text-2xl font-black text-emerald-700 tracking-tight">
                {fmt.format(actuallyActiveUsers)}
              </p>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                {activeRate}% active
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <span>Logged in & doing work</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* 4. Passive Users (Logged in with 0 modifying actions) */}
        <Card
          onClick={() => onNavigateToProductivity?.("PASSIVE")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 bg-white"
          title="Click to filter passive users in ledger"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Passive Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <p className="text-2xl font-black text-amber-600 tracking-tight">
                {fmt.format(passiveUsers)}
              </p>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                {passiveRate}% passive
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-amber-600 font-medium flex items-center gap-1">
              <span>Logged in, but 0 edits</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {/* 5. Inactive Users (0 Logins & 0 Actions) */}
        <Card
          onClick={() => onNavigateToProductivity?.("DORMANT")}
          className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 hover:border-red-400 hover:bg-red-50/20 bg-white"
          title="Click to filter inactive users (no logins) in ledger"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Inactive Users
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <p className="text-2xl font-black text-red-600 tracking-tight">
                {fmt.format(dormantUsers)}
              </p>
              <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-bold">
                {dormantRate}% not logged in
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
              <span>No logins in period</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Secondary Quick Metrics Strip (3 User/Login Health Cards - No Operations Card) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Successful Logins */}
        <div
          onClick={() => onNavigateToLogins?.("SUCCESS")}
          className="p-3 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 bg-white flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-xs group"
          title="Click to filter successful login records in ProDataTable"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Successful Logins</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{fmt.format(totalSuccessfulLogins)}</p>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5 opacity-90 group-hover:opacity-100">
              <span>Inspect logins</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </p>
          </div>
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <LogIn className="w-4 h-4" />
          </div>
        </div>

        {/* Failed Login Attempts */}
        <div
          onClick={() => onNavigateToLogins?.("FAILED")}
          className="p-3 rounded-lg border border-slate-200 hover:border-red-400 hover:bg-red-50/20 bg-white flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-xs group"
          title="Click to filter failed login attempts in ProDataTable"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Failed Login Attempts</p>
            <p className="text-lg font-bold text-red-600 mt-0.5">{fmt.format(totalFailedLogins)}</p>
            <p className="text-[10px] text-red-600 font-medium flex items-center gap-0.5 mt-0.5 opacity-90 group-hover:opacity-100">
              <span>Security review</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </p>
          </div>
          <div className="p-2 rounded-md bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Deactivated Accounts */}
        <div
          onClick={() => onNavigateToProductivity?.("DEACTIVATED")}
          className="p-3 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50/40 bg-white flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-xs group"
          title="Click to filter deactivated accounts in ProDataTable"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deactivated Accounts</p>
            <p className="text-lg font-bold text-slate-600 mt-0.5">{fmt.format(deactivatedAccounts)}</p>
            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5 mt-0.5 opacity-90 group-hover:opacity-100">
              <span>View deactivated</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </p>
          </div>
          <div className="p-2 rounded-md bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
            <UserX className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

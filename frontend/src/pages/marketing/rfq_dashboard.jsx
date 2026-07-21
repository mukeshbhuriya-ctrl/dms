import { PageContainer } from "@/components/layout/PageContainer";
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SearchableSelect } from "@/components/shared/SearchableSelect"
import apiClient from "@/api/api.client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts"
import { Activity, Briefcase, IndianRupee, PieChart as PieChartIcon } from "lucide-react"

export default function RfqDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    
    // Determine Current Financial Year (April 1 to March 31)
    const now = new Date();
    const currentFYYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    // Filters
    const [category, setCategory] = useState("Overall")
    const [clientName, setClientName] = useState("")
    const [financialYear, setFinancialYear] = useState("all")
    
    const [clientOptions, setClientOptions] = useState([])

    // Generate Financial Years for dropdown
    const financialYears = [];
    for(let i = 0; i < 5; i++) {
        const start = currentFYYear - i;
        financialYears.push(`${start}-${start+1}`);
    }

    const QUOTATION_CATEGORIES = [
        { value: "MKT", label: "Core - MKT" },
        { value: "SPR", label: "Spare - SPR" },
        { value: "ES", label: "Core - ES" },
    ];
    
    // Fetch unique clients once on mount
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await apiClient.get("/api/rfq/list/unique-filters");
                if (res.data?.clientNames) {
                    setClientOptions(res.data.clientNames.map(c => ({ label: c, value: c })));
                }
            } catch (err) {
                console.error("Failed to fetch client names", err);
            }
        };
        fetchClients();
    }, []);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                if (!data) setLoading(true)
                const res = await apiClient.get('/api/rfq/dashboard', { 
                    type: category,
                    client_name: clientName,
                    financial_year: financialYear
                })
                if (res.success) {
                    setData(res.data)
                } else {
                    setError(res.message || "Failed to load dashboard data.")
                }
            } catch (err) {
                setError("Error connecting to server.")
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        const timeoutId = setTimeout(() => {
            fetchDashboardStats()
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [category, clientName, financialYear])

    if (loading) return (
        <div className="flex-1 p-6 flex flex-col justify-center items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
    )

    if (error) return (
        <div className="flex-1 p-6 flex flex-col justify-center items-center">
            <p className="text-red-500 font-medium">{error}</p>
        </div>
    )

    const { shrenoStats, clientStats, financials } = data;

    // Prepare chart data mapped to ALL possible fields
    const shrenoChartData = [
        { name: "Tech Sub.", value: shrenoStats["Technical Submitted"] || 0, color: "#3b82f6" },
        { name: "Price Sub.", value: shrenoStats["Price Submitted"] || 0, color: "#10b981" },
        { name: "Review", value: shrenoStats["Under Review"] || 0, color: "#f59e0b" },
        { name: "Hold", value: shrenoStats["Hold"] || 0, color: "#94a3b8" },
        { name: "Cancel", value: shrenoStats["Cancel"] || 0, color: "#ef4444" },
        { name: "Duplicate", value: shrenoStats["Duplicate entry"] || 0, color: "#64748b" },
        { name: "Regret", value: shrenoStats["Regret / Not Attempted"] || 0, color: "#f43f5e" },
    ];

    const clientChartData = [
        { name: "Order", value: clientStats["Order Received"] || 0, color: "#10b981" },
        { name: "Ongoing", value: clientStats["Ongoing"] || 0, color: "#3b82f6" },
        { name: "Review", value: clientStats["Under Review"] || 0, color: "#f59e0b" },
        { name: "Lost (P)", value: clientStats["Lost by Price"] || 0, color: "#ef4444" },
        { name: "Lost (T)", value: clientStats["Lost by Technical"] || 0, color: "#e11d48" },
        { name: "Lost (D)", value: clientStats["Lost by Delivery"] || 0, color: "#f97316" },
        { name: "Cancel", value: clientStats["Cancel"] || 0, color: "#64748b" },
        { name: "Regret", value: clientStats["Regret / Not Attempted"] || 0, color: "#f43f5e" },
    ];

    return (
        <PageContainer>
            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-white border-b border-slate-200 shadow-sm rounded-lg mb-6">
                <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Name</label>
                    <SearchableSelect
                        options={clientOptions}
                        value={clientName}
                        onValueChange={setClientName}
                        placeholder="Search individual client..."
                        isFilter={true}
                    />
                </div>
                
                <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Year</label>
                    <Select value={financialYear} onValueChange={setFinancialYear}>
                        <SelectTrigger className="h-[38px] bg-white">
                            <SelectValue placeholder="All Years" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            {financialYears.map(fy => (
                                <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quotation Type</label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-[38px] bg-white">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Overall">Overall (All)</SelectItem>
                            {QUOTATION_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Top KPI Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card className="shadow-sm border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">Total RFQs Received</CardTitle>
                        <Briefcase className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{shrenoStats.Total || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Active in pipeline</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">Orders Received</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{clientStats["Order Received"] || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">Won RFQs</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">Total Quoted Value</CardTitle>
                        <IndianRupee className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">
                            ₹{Number(financials.totalQuoted).toLocaleString("en-IN")}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Estimated potential</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-gray-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">Win Rate (Value)</CardTitle>
                        <PieChartIcon className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{financials.winPercentage || "0.00"}%</div>
                        <p className="text-xs text-slate-500 mt-1">Based on quoted value</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2">
                
                {/* 1. Shreno Progress Bar Chart */}
                <Card className="shadow-sm border-gray-100">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-800">Shreno Internal Progress</CardTitle>
                        <CardDescription>Current status of RFQs in internal workflow</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={shrenoChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{fill: "rgba(0,0,0,0.04)"}}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                        {shrenoChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Client Status Donut Chart */}
                <Card className="shadow-sm border-gray-100">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-800">Status at Client End</CardTitle>
                        <CardDescription>Outcome distribution of submitted quotations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={clientChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={85}
                                        outerRadius={120}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {clientChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36} 
                                        iconType="circle" 
                                        wrapperStyle={{ fontSize: '13px', color: '#475569', paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Data Tables (Shadcn) */}
            <div className="mt-8 flex flex-col gap-6">
                
                {/* 1. Shreno Submissions status */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-slate-50 border-b border-gray-100 py-3">
                        <CardTitle className="text-center text-sm font-bold text-slate-700">Shreno Submissions status</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow className="bg-white hover:bg-white border-b-2 border-gray-200">
                                    <TableHead className="text-center text-slate-700 font-semibold border-r w-[150px]">Description</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Cancel</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Duplicate entry</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Technical Submitted</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Under Review</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Price Submitted</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r whitespace-pre-line">Regret / Not Attempted</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Hold</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="hover:bg-slate-50 border-b-2 border-gray-200">
                                    <TableCell className="font-bold text-slate-700 bg-slate-200 text-center border-r text-xs">Number of RFQ</TableCell>
                                    <TableCell className="text-center font-medium border-r">{shrenoStats["Cancel"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{shrenoStats["Duplicate entry"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{shrenoStats["Technical Submitted"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{shrenoStats["Under Review"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{shrenoStats["Price Submitted"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{shrenoStats["Regret / Not Attempted"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{shrenoStats["Hold"] || 0}</TableCell>
                                    <TableCell className="text-center font-bold">{shrenoStats["Total"] || 0}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* 2. Status at Client End */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-slate-50 border-b border-gray-100 py-3">
                        <CardTitle className="text-center text-sm font-bold text-slate-700">Status at Client End</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow className="bg-white hover:bg-white border-b-2 border-gray-200">
                                    <TableHead className="text-center text-slate-700 font-semibold border-r w-[150px]">Description</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r whitespace-pre-line">Regret / Not Attempted</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Lost by Delivery</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Lost by Price</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r whitespace-pre-line">Lost by Technical</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Ongoing</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Order Received</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Under Review</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r">Cancel</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="hover:bg-slate-50 border-b border-gray-200">
                                    <TableCell className="font-bold text-slate-700 bg-slate-200 text-center border-r text-xs">Number of RFQ</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Regret / Not Attempted"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Lost by Delivery"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Lost by Price"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Lost by Technical"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Ongoing"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Order Received"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Under Review"] || 0}</TableCell>
                                    <TableCell className="text-center font-medium border-r">{clientStats["Cancel"] || 0}</TableCell>
                                    <TableCell className="text-center font-bold">{clientStats["Total"] || 0}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-slate-50 border-b border-gray-200">
                                    <TableCell className="font-bold text-slate-700 bg-slate-200 text-center border-r text-xs">Total RFQ</TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-slate-50 border-b-2 border-gray-200">
                                    <TableCell className="font-bold text-slate-700 bg-slate-200 text-center border-r text-xs">Submitted RFQ</TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell className="border-r"></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* 3. Financials */}
                <Card className="shadow-sm border-gray-200 mb-6">
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white hover:bg-white border-b-2 border-gray-200">
                                    <TableHead className="text-center text-slate-700 font-semibold border-r w-[200px]">Total Quoted (INR)</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r w-[200px]">Order Received (INR)</TableHead>
                                    <TableHead className="text-center text-slate-700 font-semibold border-r w-[100px]">%</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="hover:bg-slate-50">
                                    <TableCell className="text-center font-bold text-base border-r">{financials.totalQuoted ? financials.totalQuoted.toLocaleString('en-IN') : 0}</TableCell>
                                    <TableCell className="text-center font-bold text-base border-r">{financials.orderReceivedValue ? financials.orderReceivedValue.toLocaleString('en-IN') : 0}</TableCell>
                                    <TableCell className="text-center font-bold text-base border-r">{financials.winPercentage || "0.00"}%</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    )
}

import { useState, useEffect } from "react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import apiClient from "@/api/api.client"

export default function RfqDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [category, setCategory] = useState("Core") // Default to Core

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                // Keep minimal loading flicker if we already have data
                if (!data) setLoading(true)
                const res = await apiClient.get('/api/rfq/dashboard', { type: category })
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

        fetchDashboardStats()
    }, [category])

    if (loading) return (
        <>
                <header className="flex shrink-0 items-center justify-between border-b bg-white h-16 px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <h1 className="font-semibold text-lg">RFQ Dashboard</h1>
                    </div>
                </header>
                <div className="flex-1 p-6 flex flex-col justify-center items-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
                </div>
        </>
    )

    if (error) return (
        <>
                <header className="flex shrink-0 items-center justify-between border-b bg-white h-16 px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <h1 className="font-semibold text-lg">RFQ Dashboard</h1>
                    </div>
                </header>
                <div className="flex-1 p-6 flex flex-col justify-center items-center">
                    <p className="text-red-500 font-medium">{error}</p>
                </div>
        </>
    )

    const { shrenoStats, clientStats, financials } = data;

    return (
        <>
                <header className="flex shrink-0 items-center justify-between border-b bg-white h-16 px-4">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <h1 className="font-semibold text-lg">RFQ Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quotation Type:</span>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="w-[180px] h-9 text-xs font-semibold">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Core">Core - MKT</SelectItem>
                                    <SelectItem value="Spare">Spare - SPR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6 flex flex-col">
                    <div className="flex-1 flex flex-col w-full">

                        {/* 1. Shreno Submissions status */}
                        <div className="bg-gray-100 border-b border-gray-200 font-bold text-center py-3 text-red-600">
                            Shreno Submittions status
                        </div>
                        <div className="grid text-xs font-semibold text-center border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Description</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Cancel</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Duplicate entry</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Technical Submitted</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Under Review</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Price Submitted</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center flex-col leading-tight"><span>Regret / Not</span><span>Attempted</span></div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Hold</div>
                            <div className="p-3 text-red-600 flex items-center justify-center">Total</div>
                        </div>
                        <div className="grid text-sm text-center border-b-4 border-gray-300" style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}>
                            <div className="p-3 border-r border-gray-200 bg-[#ffc000] font-bold flex items-center justify-center text-red-600 text-xs">Number of RFQ</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{shrenoStats?.Cancel || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{shrenoStats?.["Duplicate entry"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{shrenoStats?.["Technical Submitted"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{shrenoStats?.["Under Review"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{shrenoStats?.["Price Submitted"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{shrenoStats?.["Regret / Not Attempted"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{shrenoStats?.Hold || 0}</div>
                            <div className="p-3 flex items-center justify-center font-medium">{shrenoStats?.Total || 0}</div>
                        </div>

                        {/* 2. Status at Client End */}
                        <div className="bg-gray-100 border-b border-gray-200 font-bold text-center py-3 text-red-600 mt-4">
                            Status at Client End
                        </div>
                        <div className="grid grid-cols-10 text-xs font-semibold text-center border-b border-gray-200 bg-gray-50">
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Description</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center flex-col leading-tight"><span>Regret / Not</span><span>Attempted</span></div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Lost by Delivery</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Lost by Price</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Lost by Technical</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Ongoing</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Order Received</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Under Review</div>
                            <div className="p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Cancel</div>
                            <div className="p-3 text-red-600 flex items-center justify-center">Total</div>
                        </div>

                        <div className="grid grid-cols-10 text-sm text-center border-b border-gray-200">
                            <div className="p-3 border-r border-gray-200 bg-[#ffc000] font-bold flex items-center justify-center text-red-600 text-[10px]">Number of RFQ</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.["Regret / Not Attempted"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.["Lost by Delivery"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.["Lost by Price"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.["Lost by Technical"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.Ongoing || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.["Order Received"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.["Under Review"] || 0}</div>
                            <div className="p-3 border-r border-gray-200 flex items-center justify-center font-medium">{clientStats?.Cancel || 0}</div>
                            <div className="p-3 flex items-center justify-center font-medium">{clientStats?.Total || 0}</div>
                        </div>

                        <div className="grid grid-cols-10 text-sm text-center border-b border-gray-200">
                            <div className="p-3 border-r border-gray-200 bg-[#ffc000] font-bold flex items-center justify-center text-red-600 text-[10px]">Total RFQ</div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3"></div>
                        </div>

                        <div className="grid grid-cols-10 text-sm text-center border-b-4 border-gray-300">
                            <div className="p-3 border-r border-gray-200 bg-[#ffc000] font-bold flex items-center justify-center text-red-600 text-[10px]">Submitted RFQ</div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3 border-r border-gray-200"></div>
                            <div className="p-3"></div>
                        </div>

                        {/* 3. Financials */}
                        <div className="mt-4 border-t-4 border-gray-300">
                            <div className="grid grid-cols-10 text-xs font-semibold text-center border-b border-gray-200 bg-gray-50">
                                <div className="col-span-2 p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Total Quoted (INR)</div>
                                <div className="col-span-2 p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">Order Received (INR)</div>
                                <div className="col-span-1 p-3 border-r border-gray-200 text-red-600 flex items-center justify-center">%</div>
                                <div className="col-span-5 p-3"></div>
                            </div>

                            <div className="grid grid-cols-10 text-sm text-center">
                                <div className="col-span-2 p-3 border-r border-gray-200 flex items-center justify-center font-medium bg-white">{financials?.totalQuoted ? financials.totalQuoted.toLocaleString('en-IN') : 0}</div>
                                <div className="col-span-2 p-3 border-r border-gray-200 flex items-center justify-center font-medium bg-white">{financials?.orderReceivedValue ? financials.orderReceivedValue.toLocaleString('en-IN') : 0}</div>
                                <div className="col-span-1 p-3 border-r border-gray-200 flex items-center justify-center font-medium bg-white">{financials?.winPercentage || "0.00"}%</div>
                                <div className="col-span-5 p-3"></div>
                            </div>
                        </div>

                    </div>
                </main>
        </>
    )
}

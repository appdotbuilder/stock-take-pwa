
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Part } from '../../../server/src/schema';

interface StockTakingProps {
  projectId: number;
  userId: number;
  onBack: () => void;
}

interface PartWithCounting extends Part {
  counted_qty?: number;
  count_remark?: string;
  is_counted?: boolean;
}

export function StockTaking({ projectId, userId, onBack }: StockTakingProps) {
  const [parts, setParts] = useState<PartWithCounting[]>([]);
  const [filteredParts, setFilteredParts] = useState<PartWithCounting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [activeTab, setActiveTab] = useState<'scan' | 'browse'>('scan');
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);

  const loadParts = useCallback(async () => {
    try {
      const result = await trpc.getPartsByProject.query({ projectId });
      const partsWithCounting = result.map((part: Part) => ({
        ...part,
        counted_qty: part.qty_sisa,
        count_remark: part.remark || '',
        is_counted: false
      }));
      setParts(partsWithCounting);
      setFilteredParts(partsWithCounting);
      
      // Create stock taking session
      const session = await trpc.createStockTakingSession.mutate({
        user_id: userId,
        project_id: projectId,
        session_name: `Stock Taking - ${new Date().toLocaleString()}`
      });
      setSessionId(session.id);
    } catch (error) {
      console.error('Failed to load parts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, userId]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  useEffect(() => {
    const filtered = parts.filter((part: PartWithCounting) =>
      part.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.no.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredParts(filtered);
  }, [searchTerm, parts]);

  const handleQRScan = async () => {
    if (!qrCode.trim()) return;
    
    try {
      const result = await trpc.scanQRCode.mutate({ qr_code: qrCode });
      if (result) {
        // Find parts in the scanned storage location using the correct property name
        const locationParts = parts.filter((part: PartWithCounting) => 
          part.storage_location_id === result.id
        );
        setFilteredParts(locationParts);
        setActiveTab('browse');
        setQrCode('');
        
        // Show feedback about found parts
        if (locationParts.length === 0) {
          // TODO: Show message that no parts found in this location
          console.log('No parts found in this storage location');
        }
      } else {
        // QR code not found
        console.log('QR code not found');
        // TODO: Show error message
      }
    } catch (error) {
      console.error('QR scan failed:', error);
      // TODO: Show error message to user
    }
  };

  const handlePartUpdate = async (partId: number, countedQty: number, remark: string) => {
    if (!sessionId) return;

    try {
      await trpc.recordStockCount.mutate({
        session_id: sessionId,
        part_id: partId,
        qty_counted: countedQty,
        remark: remark || null
      });

      // Update local state
      setParts((prevParts: PartWithCounting[]) => 
        prevParts.map((part: PartWithCounting) => 
          part.id === partId 
            ? { ...part, counted_qty: countedQty, count_remark: remark, is_counted: true }
            : part
        )
      );
    } catch (error) {
      console.error('Failed to record count:', error);
    }
  };

  const completedCount = parts.filter((part: PartWithCounting) => part.is_counted).length;
  const totalCount = parts.length;

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={onBack} size="sm">
          ← Back
        </Button>
        <Badge variant="outline" className="text-sm">
          {completedCount}/{totalCount} completed
        </Badge>
      </div>

      <h2 className="text-xl font-semibold mb-4">📱 Stock Taking</h2>

      {/* Progress */}
      <Card className="p-4 mb-4 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm">{Math.round((completedCount / totalCount) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          ></div>
        </div>
      </Card>

      {/* Tabs for scan vs browse */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'scan' | 'browse')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan">📷 QR Scan</TabsTrigger>
          <TabsTrigger value="browse">📋 Browse</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scan" className="space-y-4">
          <Card className="p-4">
            <div className="text-center mb-4">
              <span className="text-4xl mb-2 block">📷</span>
              <p className="text-sm text-gray-600">Scan storage location QR code</p>
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter QR code or scan..."
                value={qrCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQrCode(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleQRScan} disabled={!qrCode.trim()}>
                Scan
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="browse" className="space-y-4">
          <Input
            placeholder="🔍 Search parts..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </TabsContent>
      </Tabs>

      {/* Parts list */}
      <div className="space-y-3">
        {filteredParts.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="text-4xl mb-4 block">📦</span>
            <p className="text-gray-600">No parts found</p>
            {activeTab === 'scan' && (
              <p className="text-sm text-gray-500 mt-2">
                Try scanning a QR code or switch to browse mode
              </p>
            )}
          </Card>
        ) : (
          filteredParts.map((part: PartWithCounting) => (
            <PartCountingCard
              key={part.id}
              part={part}
              onUpdate={handlePartUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface PartCountingCardProps {
  part: PartWithCounting;
  onUpdate: (partId: number, countedQty: number, remark: string) => void;
}

function PartCountingCard({ part, onUpdate }: PartCountingCardProps) {
  const [countedQty, setCountedQty] = useState<string>(part.counted_qty?.toString() || '0');
  const [remark, setRemark] = useState(part.count_remark || '');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSave = () => {
    const qty = parseInt(countedQty) || 0;
    onUpdate(part.id, qty, remark);
    setIsExpanded(false);
  };

  const difference = (parseInt(countedQty) || 0) - part.qty_sisa;

  return (
    <Card className={`p-4 ${part.is_counted ? 'bg-green-50 border-green-200' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium text-gray-900">{part.part_name}</h3>
            {part.is_counted && <Badge className="text-xs bg-green-100 text-green-800">✓ Counted</Badge>}
          </div>
          <p className="text-sm text-gray-600 mb-1">
            #{part.part_number} • {part.no}
          </p>
          <div className="flex space-x-4 text-sm">
            <span>📦 Standard: {part.qty_std}</span>
            <span>📊 Current: {part.qty_sisa}</span>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▲' : '▼'}
        </Button>
      </div>

      {isExpanded && (
        <div className="border-t pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Counted Qty</label>
              <Input
                type="number"
                value={countedQty}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountedQty(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Difference</label>
              <div className={`h-10 px-3 py-2 border rounded-md flex items-center font-mono ${
                difference === 0 ? 'bg-gray-50' : 
                difference > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {difference > 0 ? '+' : ''}{difference}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Remark (Optional)</label>
            <Textarea
              value={remark}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemark(e.target.value)}
              placeholder="Add any notes or observations..."
              rows={2}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
              💾 Save Count
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsExpanded(false)}
              className="px-4"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

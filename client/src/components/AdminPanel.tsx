
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { CreateProjectInput, CreateStorageLocationInput, CreateUserInput } from '../../../server/src/schema';

interface AdminPanelProps {
  onBack: () => void;
}

type AdminTab = 'users' | 'projects' | 'locations' | 'upload';

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={onBack} size="sm">
          ← Back
        </Button>
        <Badge variant="outline">Admin Panel</Badge>
      </div>

      <h2 className="text-xl font-semibold mb-4">⚙️ Admin Panel</h2>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects" className="text-xs">📋 Projects</TabsTrigger>
          <TabsTrigger value="locations" className="text-xs">📍 Locations</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">👥 Users</TabsTrigger>
          <TabsTrigger value="upload" className="text-xs">📊 Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <ProjectManagement />
        </TabsContent>

        <TabsContent value="locations">
          <LocationManagement />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="upload">
          <DataUpload />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectManagement() {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: null
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.createProject.mutate(formData);
      setFormData({ name: '', description: null });
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-4">Create New Project</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <Input
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData((prev: CreateProjectInput) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter project name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <Textarea
              value={formData.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                setFormData((prev: CreateProjectInput) => ({ 
                  ...prev, 
                  description: e.target.value || null 
                }))
              }
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating...' : '📋 Create Project'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function LocationManagement() {
  const [formData, setFormData] = useState<CreateStorageLocationInput>({
    location_code: '',
    location_name: '',
    qr_code: null
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.createStorageLocation.mutate(formData);
      setFormData({ location_code: '', location_name: '', qr_code: null });
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to create storage location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-4">Create Storage Location</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Location Code</label>
            <Input
              value={formData.location_code}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData((prev: CreateStorageLocationInput) => ({ 
                  ...prev, 
                  location_code: e.target.value 
                }))
              }
              placeholder="e.g., WH-A-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Location Name</label>
            <Input
              value={formData.location_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData((prev: CreateStorageLocationInput) => ({ 
                  ...prev, 
                  location_name: e.target.value 
                }))
              }
              placeholder="e.g., Warehouse A - Shelf 1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">QR Code (Optional)</label>
            <Input
              value={formData.qr_code || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData((prev: CreateStorageLocationInput) => ({ 
                  ...prev, 
                  qr_code: e.target.value || null 
                }))
              }
              placeholder="QR code for scanning"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating...' : '📍 Create Location'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function UserManagement() {
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    role: 'STOCK_TAKER'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await trpc.createUser.mutate(formData);
      setFormData({ username: '', email: '', password: '', role: 'STOCK_TAKER' });
      // TODO: Show success message
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-4">Create New User</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <Input
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
              }
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
              }
              placeholder="Enter password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'ADMIN' | 'STOCK_TAKER') => 
                setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STOCK_TAKER">👤 Stock Taker</SelectItem>
                <SelectItem value="ADMIN">👑 Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating...' : '👥 Create User'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function DataUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.includes('sheet')) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedProject) return;

    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await trpc.uploadMasterData.mutate({
          project_id: parseInt(selectedProject),
          file_data: base64.split(',')[1] // Remove data:... prefix
        });
        setFile(null);
        setSelectedProject('');
        // TODO: Show success message
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-4">Upload Master Data</h3>
        
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Project</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Project Alpha</SelectItem>
                <SelectItem value="2">Project Beta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Excel File</label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              required
            />
            {file && (
              <p className="text-sm text-green-600 mt-1">
                ✓ {file.name}
              </p>
            )}
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <p className="font-medium mb-1">Expected columns:</p>
            <p className="text-xs">No, PART, std_pack, project, part_name, part_number, storage, supplier_code, supplier_name, type, image, qty_std, qty_sisa, remark</p>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !file || !selectedProject} 
            className="w-full"
          >
            {isLoading ? 'Uploading...' : '📊 Upload Data'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

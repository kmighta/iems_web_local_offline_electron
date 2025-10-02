import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X } from "lucide-react";

const LgAcpModal = ({ isOpen, onClose }) => {
  const [acpSettings, setAcpSettings] = useState(() => {
    // 10개의 ACP 설정 초기화 (기본값)
    const settings = [];
    for (let i = 0; i < 10; i++) {
      settings.push({
        id: i + 1,
        ipA: i === 0 ? "192" : "0",
        ipB: i === 0 ? "168" : "0", 
        ipC: i === 0 ? "10" : "0",
        ipD: i === 0 ? "201" : "0",
        port: i === 0 ? "9002" : "0",
        status: i === 0 ? "1" : "0",
        isConnected: i === 0
      });
    }
    return settings;
  });

  const [editingField, setEditingField] = useState(null);

  const handleInputChange = (id, field, value) => {
    setAcpSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, [field]: value }
          : setting
      )
    );
  };

  const handleConnect = (id) => {
    setAcpSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, isConnected: !setting.isConnected }
          : setting
      )
    );
  };

  const handleSave = (id) => {
    // 저장 로직 구현
    console.log(`ACP ${id} 설정 저장:`, acpSettings.find(s => s.id === id));
    // 여기에 실제 저장 API 호출 로직 추가
  };

  const handleAddAcp = () => {
    if (acpSettings.length < 20) {
      const newId = acpSettings.length + 1;
      const newAcp = {
        id: newId,
        ipA: "0",
        ipB: "0",
        ipC: "0", 
        ipD: "0",
        port: "0",
        status: "0",
        isConnected: false
      };
      setAcpSettings(prev => [...prev, newAcp]);
    }
  };

  const handleRemoveAcp = (id) => {
    if (acpSettings.length > 1) {
      setAcpSettings(prev => {
        const filtered = prev.filter(setting => setting.id !== id);
        // ID 재정렬
        return filtered.map((setting, index) => ({
          ...setting,
          id: index + 1
        }));
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[880px] max-h-[90vh] overflow-y-auto dark:bg-slate-800 text-white">
        <DialogHeader className="flex flex-row justify-between items-center mt-4">
          <DialogTitle className="text-2xl font-bold text-black dark:text-white">
            LG ACP 설정 ({acpSettings.length}개)
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <Button
                onClick={handleAddAcp}
                disabled={acpSettings.length >= 20}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1"
              >
                + 추가
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-center my-2">
          <div className="w-[800px] bg-white dark:bg-slate-700 rounded-lg overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow className="text-white dark:text-black">
                  <TableHead className="w-10 text-center text-black dark:text-white">번호</TableHead>
                  <TableHead className="w-20 text-center text-black dark:text-white">IP_A</TableHead>
                  <TableHead className="w-20 text-center text-black dark:text-white">IP_B</TableHead>
                  <TableHead className="w-20 text-center text-black dark:text-white">IP_C</TableHead>
                  <TableHead className="w-20 text-center text-black dark:text-white">IP_D</TableHead>
                  <TableHead className="w-20 text-center text-black dark:text-white">Port</TableHead>
                  <TableHead className="w-20 text-center text-black dark:text-white">상태</TableHead>
                  <TableHead className="w-36 text-center text-black dark:text-white"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acpSettings.map((setting) => (
                  <TableRow 
                    key={setting.id}
                    className={`${setting.id === 1 ? 'bg-red-50 dark:bg-slate-600' : ''} hover:bg-gray-50 dark:hover:bg-slate-600`}
                  >
                    <TableCell className="text-black dark:text-white text-center font-medium">
                      {setting.id}
                    </TableCell>
                    <TableCell className="text-black dark:text-white text-center">
                      <div className="flex justify-center">
                        <Input
                          value={setting.ipA}
                          onChange={(e) => handleInputChange(setting.id, 'ipA', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          onFocus={() => setEditingField(`${setting.id}-ipA`)}
                          onBlur={() => setEditingField(null)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-black dark:text-white text-center">
                      <div className="flex justify-center">
                        <Input
                          value={setting.ipB}
                          onChange={(e) => handleInputChange(setting.id, 'ipB', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          onFocus={() => setEditingField(`${setting.id}-ipB`)}
                          onBlur={() => setEditingField(null)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-black dark:text-white text-center">
                      <div className="flex justify-center">
                        <Input
                          value={setting.ipC}
                          onChange={(e) => handleInputChange(setting.id, 'ipC', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          onFocus={() => setEditingField(`${setting.id}-ipC`)}
                          onBlur={() => setEditingField(null)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-black dark:text-white text-center">
                      <div className="flex justify-center">
                        <Input
                          value={setting.ipD}
                          onChange={(e) => handleInputChange(setting.id, 'ipD', e.target.value)}
                          className={`w-16 h-8 text-center text-sm ${
                            editingField === `${setting.id}-ipD` ? 'text-blue-600' : ''
                          }`}
                          onFocus={() => setEditingField(`${setting.id}-ipD`)}
                          onBlur={() => setEditingField(null)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-black dark:text-white text-center">
                      <div className="flex justify-center">
                        <Input
                          value={setting.port}
                          onChange={(e) => handleInputChange(setting.id, 'port', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          onFocus={() => setEditingField(`${setting.id}-port`)}
                          onBlur={() => setEditingField(null)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-black dark:text-white text-center">
                      <div className="flex justify-center">
                        <Input
                          value={setting.status}
                          onChange={(e) => handleInputChange(setting.id, 'status', e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                          onFocus={() => setEditingField(`${setting.id}-status`)}
                          onBlur={() => setEditingField(null)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-black dark:text-white text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <Button
                          onClick={() => handleConnect(setting.id)}
                          className={`h-7 px-3 text-xs ${
                            setting.isConnected 
                              ? 'bg-green-500 hover:bg-green-600 text-white' 
                              : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          {setting.isConnected ? '연결' : '해제'}
                        </Button>
                        <Button
                          onClick={() => handleSave(setting.id)}
                          className="h-7 px-3 text-xs bg-gray-500 hover:bg-gray-600 text-white"
                        >
                          저장
                        </Button>
                        {acpSettings.length > 1 && (
                          <Button
                            onClick={() => handleRemoveAcp(setting.id)}
                            className="h-7 px-3 text-xs bg-red-500 hover:bg-red-600 text-white"
                          >
                            삭제
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LgAcpModal;

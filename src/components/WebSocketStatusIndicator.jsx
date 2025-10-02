import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import useOrganizationStore from '@/store/organizationStore';

const WebSocketStatusIndicator = () => {
  const { isWebSocketConnected } = useOrganizationStore();

  if (!isWebSocketConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="h-6 px-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
              연결 끊김
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>서버와의 실시간 통신이 끊어졌습니다.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="h-6 px-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            실시간 연결
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>서버와 실시간으로 연결되어 있습니다.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WebSocketStatusIndicator;

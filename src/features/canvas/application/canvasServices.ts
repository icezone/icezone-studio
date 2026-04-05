/**
 * Canvas services wiring for Web version.
 * Replaces desktop Tauri adapters with Web API adapters.
 */
import { InMemoryCanvasEventBus } from './eventBus';
import { DefaultGraphImageResolver } from './graphImageResolver';
import { nodeCatalog } from './nodeCatalog';
import { CanvasNodeFactory } from './nodeFactory';
import { CanvasToolProcessor } from './toolProcessor';
import { uuidGenerator } from '../infrastructure/idGenerator';
import { webAiGateway } from '../infrastructure/webAiGateway';
import { webImageSplitGateway } from '../infrastructure/webImageSplitGateway';
import { webVideoGateway } from '../infrastructure/webVideoGateway';
import { webLlmAnalysisGateway } from '../infrastructure/webLlmAnalysisGateway';

export const canvasEventBus = new InMemoryCanvasEventBus();
export const canvasNodeFactory = new CanvasNodeFactory(uuidGenerator, nodeCatalog);
export const graphImageResolver = new DefaultGraphImageResolver();
export const canvasToolProcessor = new CanvasToolProcessor(webImageSplitGateway, uuidGenerator);
export const canvasAiGateway = webAiGateway;
export const canvasVideoAiGateway = webVideoGateway;
export const canvasLlmAnalysisGateway = webLlmAnalysisGateway;

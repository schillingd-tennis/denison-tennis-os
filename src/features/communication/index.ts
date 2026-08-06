export type {
  Communication,
  CommunicationActionKind,
  CommunicationAttachment,
  CommunicationEntry,
  CommunicationMetadata,
  CommunicationType,
} from "./types";

export {
  createCommunicationActions,
  type CommunicationAction,
  type CommunicationActionMap,
} from "./services/communicationActions";
export { getMockCommunications } from "./services/mockCommunications";

export { usePersonCommunications } from "./hooks/usePersonCommunications";

export {
  COMMUNICATION_TYPE_META,
  getCommunicationTypeIcon,
  getCommunicationTypeLabel,
} from "./utils/typeMeta";
export { sortCommunicationsNewestFirst } from "./utils/sortCommunications";
export { communicationsToActivityItems } from "./utils/toActivityItems";

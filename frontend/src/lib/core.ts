/**
 * Single entry point for every core (`@/`) import Mint uses, so a core module move is a one-file edit here.
 * Re-exports only; never wrap: hookable components (Sidebar, Alert, AppIcon, AuthWrapper, Notification,
 * ServerContentContainer, ...) must stay the exact objects core renders.
 *
 * Deprecated flat-path shims (core 1.2.3): every flat path Mint used that 1.2.3 marks `@deprecated`
 * (`@/elements/Card.tsx`, `@/lib/server.ts`, ...) has its nested path in both release-1.2.0 and 1.2.3,
 * so all imports below use the nested path and no deprecated shim is still used.
 */

// API clients
export { default as getAllEggs } from '@/api/admin/nests/getAllEggs.ts';
export { default as getAdminServers } from '@/api/admin/servers/getServers.ts';
export { default as getAdminUsers } from '@/api/admin/users/getUsers.ts';
export { axiosInstance, httpErrorToHuman } from '@/api/axios.ts';
export { default as getServers } from '@/api/server/getServers.ts';
export { default as renameServer } from '@/api/server/settings/renameServer.ts';
export { default as updateDockerImage } from '@/api/server/startup/updateDockerImage.ts';

// Elements (UI components; hookable ones must keep core identity)
export { default as AppIcon } from '@/elements/AppIcon.tsx';
export { default as ActionIcon } from '@/elements/buttons/ActionIcon.tsx';
export { default as Button } from '@/elements/buttons/Button.tsx';
export { default as UnstyledButton } from '@/elements/buttons/UnstyledButton.tsx';
export { AdminCan, ServerCan } from '@/elements/Can.tsx';
export { default as CopyOnClick } from '@/elements/CopyOnClick.tsx';
export { default as ChartBlock } from '@/elements/charts/ChartBlock.tsx';
export { default as ChartLegend } from '@/elements/charts/ChartLegend.tsx';
export { default as StreamChart } from '@/elements/charts/StreamChart.tsx';
export { default as AdminContentContainer } from '@/elements/containers/AdminContentContainer.tsx';
export type { Props as ServerContentContainerProps } from '@/elements/containers/ServerContentContainer.tsx';
export { default as ServerContentContainer } from '@/elements/containers/ServerContentContainer.tsx';
export { default as Avatar } from '@/elements/data-display/Avatar.tsx';
export { default as Badge } from '@/elements/data-display/Badge.tsx';
export { default as Card } from '@/elements/data-display/Card.tsx';
export { default as StatCard } from '@/elements/data-display/StatCard.tsx';
export { default as TitleCard } from '@/elements/data-display/TitleCard.tsx';
export { DndBoard, DndContainer, DndSortableList, SortableItem } from '@/elements/dnd/DragAndDrop.tsx';
export { default as ExtensionSlot } from '@/elements/ExtensionSlot.tsx';
export { default as Alert } from '@/elements/feedback/Alert.tsx';
export { default as Notification } from '@/elements/feedback/Notification.tsx';
export { default as Progress } from '@/elements/feedback/Progress.tsx';
export { default as Spinner } from '@/elements/feedback/Spinner.tsx';
export { default as Checkbox } from '@/elements/input/Checkbox.tsx';
export { default as FileInput } from '@/elements/input/FileInput.tsx';
export { default as Select } from '@/elements/input/Select.tsx';
export { default as Switch } from '@/elements/input/Switch.tsx';
export { default as TextArea } from '@/elements/input/TextArea.tsx';
export { default as TextInput } from '@/elements/input/TextInput.tsx';
export { default as Group } from '@/elements/layout/Group.tsx';
export { default as SegmentedControl } from '@/elements/layout/SegmentedControl.tsx';
export { default as Stack } from '@/elements/layout/Stack.tsx';
export { default as ConfirmationModal } from '@/elements/modals/ConfirmationModal.tsx';
export { Modal, ModalFooter } from '@/elements/modals/Modal.tsx';
export { default as ServerSwitcher } from '@/elements/navigation/ServerSwitcher.tsx';
export { default as Sidebar } from '@/elements/navigation/Sidebar.tsx';
export { default as Menu } from '@/elements/overlays/Menu.tsx';
export { default as Tooltip } from '@/elements/overlays/Tooltip.tsx';
export { default as QuickActionsTrigger } from '@/elements/quickActions/QuickActionsTrigger.tsx';
export { default as Code } from '@/elements/typography/Code.tsx';
export { default as Kbd } from '@/elements/typography/Kbd.tsx';
export { default as Text } from '@/elements/typography/Text.tsx';
export { default as Title } from '@/elements/typography/Title.tsx';

// Library helpers and schemas
export { isAdmin } from '@/lib/auth/permissions.ts';
export type { ChartLegendProps, StreamChartProps } from '@/lib/chart.ts';
export { formatBytes, formatBytesRate, formatPercent, useStreamChart } from '@/lib/chart.ts';
export { formatAllocation, isConflictingState, serverStatusInfo } from '@/lib/domain/server.ts';
export { restrictToVerticalAxis } from '@/lib/dragAndDrop.ts';
export { announcementTypeColorMapping } from '@/lib/enums.ts';
export { bytesToString, mbToBytes } from '@/lib/format/size.ts';
export { formatDateTime, formatMilliseconds } from '@/lib/format/time.ts';
export { queryKeys } from '@/lib/queryKeys.ts';
export { useServerQuickActionTarget } from '@/lib/quickActions/coreQuickActions.tsx';
export { getShortcutDefinition } from '@/lib/quickActions/coreShortcuts.tsx';
export { useShortcutOverrides } from '@/lib/quickActions/shortcutOverrides.ts';
export type { ModifierKey } from '@/lib/quickActions/shortcuts.ts';
export { effectiveBinding } from '@/lib/quickActions/shortcuts.ts';
export type { adminAnnouncementSchema } from '@/lib/schemas/admin/announcements.ts';
export type { adminServerSchema } from '@/lib/schemas/admin/servers.ts';
export type { adminFullUserSchema } from '@/lib/schemas/admin/users.ts';
export type { announcementSchema } from '@/lib/schemas/announcements.ts';
export type { serverPowerAction, serverPowerState, serverSchema } from '@/lib/schemas/server/server.ts';
export { serverSettingsRenameSchema } from '@/lib/schemas/server/settings.ts';
export type { fullUserSchema } from '@/lib/schemas/user.ts';
export { getUserSetting, useUserSetting } from '@/lib/userSettings.ts';
export type { Props as AuthWrapperProps } from '@/pages/auth/AuthWrapper.tsx';
// Page-level components
export { default as AuthWrapper } from '@/pages/auth/AuthWrapper.tsx';
export { default as AvatarContainer } from '@/pages/dashboard/account/AvatarContainer.tsx';
export { default as BulkActionBar } from '@/pages/dashboard/home/BulkActionBar.tsx';
export { default as Console } from '@/pages/server/console/terminal/Console.tsx';

// Hooks
export { useKeyboardShortcuts } from '@/plugins/quick-actions/useKeyboardShortcuts.ts';
export { useQuickActionLocation } from '@/plugins/quick-actions/useQuickActions.ts';
export { useSearchablePaginatedTable } from '@/plugins/resource/useSearchablePaginatedTable.ts';
export { useBulkPowerActions } from '@/plugins/server/useBulkPowerActions.ts';
export { useServerListShowOthers } from '@/plugins/server/useServerListShowOthers.ts';
export { useServerStats } from '@/plugins/server/useServerStats.ts';
export { useStartOnGroupedServers } from '@/plugins/server/useStartOnGroupedServers.ts';
export { useBlocker } from '@/plugins/useBlocker.ts';
export { useAdminCan } from '@/plugins/usePermissions.ts';
export { useVisualViewportBottomInset } from '@/plugins/viewport/useVisualViewport.ts';
export { SocketRequest } from '@/plugins/websocket/useWebsocketEvent.ts';

// Providers
export { useAuth } from '@/providers/AuthProvider.tsx';
export { useFileManager } from '@/providers/FileManagerProvider.tsx';
export { useToast } from '@/providers/ToastProvider.tsx';
export { useTranslations } from '@/providers/TranslationProvider.tsx';

// Stores
export { useGlobalStore } from '@/stores/global.ts';
export { useQuickActionsStore } from '@/stores/quickActions.ts';
export { useRelativePageStore } from '@/stores/relativePage.ts';
export type { ServerStore } from '@/stores/server.ts';
export { useServerStore, useServerStoreApi } from '@/stores/server.ts';
export { useUserStore } from '@/stores/user.ts';
export { useUserSettingsStore } from '@/stores/userSettings.ts';

export type { QueryClient } from "./_query-client";
export { CACHE_TAGS, makeQueryClient } from "./_query-client";

export { useLogin, useLogout, useMe, useRegister } from "./auth";
export {
  useCreateFestival,
  useDeleteFestival,
  useFestival,
  useFestivals,
  useUpdateFestival,
} from "./festivals";
export {
  useBulkCreateStudents,
  useCreateStudent,
  useDeleteStudent,
  useExportExcelStudents,
  useStudent,
  useStudents,
  useUpdateStudent,
  useValidateStudents,
} from "./students";
export {
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useUpdateGroup,
} from "./groups";
export {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "./categories";
export {
  useAssignments,
  useBulkCreateAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useUpdateAssignment,
} from "./assignments";
export {
  useCreateProgramme,
  useDeleteProgramme,
  useProgramme,
  useProgrammes,
  useUpdateProgramme,
} from "./programmes";
export {
  useCreateJudge,
  useDeleteJudge,
  useJudges,
  useUpdateJudge,
} from "./judges";
export { useAddMember, useMembers, useRemoveMember } from "./members";
export {
  useCreateStage,
  useDeleteStage,
  useStages,
  useUpdateStage,
} from "./stages";
export {
  useCreateScheduleItem,
  useDeleteScheduleItem,
  useSchedule,
  useUpdateScheduleItem,
} from "./schedule";
export {
  usePublishResults,
  useResults,
  useSaveResult,
  useUnpublishResults,
} from "./results";
export {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "./notifications";
export {
  useFestivalPayment,
  useInitiatePayment,
  usePaymentHistory,
  usePaymentStatus,
  useVerifyPayment,
} from "./payments";
export { useUnusedCredit } from "./billing";
export {
  useCreateGalleryItem,
  useDeleteGalleryItem,
  useGallery,
} from "./gallery";
export {
  useCreateNews,
  useDeleteNews,
  useNews,
  useUpdateNews,
} from "./news";
export { useCloudinaryUpload, useDeleteFile, useUploadFile } from "./upload";
export { useProfile, useUpdateProfile } from "./profile";
export { useJoinedFestivals, useMyFestivals } from "./my-festival";
export {
  useRequestOtp,
  useTeamLeaderDashboard,
  useTeamLeaderFestivals,
  useTeamLeaderLogout,
  useTeamLeaderStudents,
  useVerifyOtp,
} from "./team-leader";
export { useSuperAdminAnalytics, useSuperAdminPayments } from "./admin";
export type { SuperAdminPayment } from "./admin";

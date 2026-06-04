import { LocalAuthService, LocalMessageService, LocalPhotographerService, LocalPropertyService, LocalReferencingService } from "../services/localServices";
import { ApiAuthService, ApiMessageService, ApiPhotographerService, ApiPropertyService, ApiReferencingService } from "../services/apiServices";
import { SupabaseAuthService, SupabaseMessageService, SupabasePhotographerService, SupabasePropertyService, SupabaseReferencingService } from "../services/supabaseServices";

const useApi = import.meta.env.VITE_DATA_MODE === "api";
const useSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export const authService = useSupabase ? new SupabaseAuthService() : useApi ? new ApiAuthService() : new LocalAuthService();
export const propertyService = useSupabase ? new SupabasePropertyService() : useApi ? new ApiPropertyService() : new LocalPropertyService();
export const messageService = useSupabase ? new SupabaseMessageService() : useApi ? new ApiMessageService() : new LocalMessageService();
export const referencingService = useSupabase ? new SupabaseReferencingService() : useApi ? new ApiReferencingService() : new LocalReferencingService();
export const photographerService = useSupabase ? new SupabasePhotographerService() : useApi ? new ApiPhotographerService() : new LocalPhotographerService();

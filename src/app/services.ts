import { LocalAuthService, LocalMessageService, LocalPhotographerService, LocalPropertyService, LocalReferencingService } from "../services/localServices";
import { SupabaseAuthService, SupabaseMessageService, SupabasePhotographerService, SupabasePropertyService, SupabaseReferencingService } from "../services/supabaseServices";

const useSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

export const authService = useSupabase ? new SupabaseAuthService() : new LocalAuthService();
export const propertyService = useSupabase ? new SupabasePropertyService() : new LocalPropertyService();
export const messageService = useSupabase ? new SupabaseMessageService() : new LocalMessageService();
export const referencingService = useSupabase ? new SupabaseReferencingService() : new LocalReferencingService();
export const photographerService = useSupabase ? new SupabasePhotographerService() : new LocalPhotographerService();

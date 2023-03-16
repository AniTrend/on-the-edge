 #!/bin/bash
 
 CURRENT_DIR=$(pwd)

cd ../../

SUPABASE_PROJECT_ID=$(cat supabase/.temp/project-ref)
 
supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public > supabase/functions/_shared/types/supabase.d.ts

cd $CURRENT_DIR

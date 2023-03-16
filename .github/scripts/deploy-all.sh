#!/bin/bash

CURRENT_DIR=$(pwd)

cd ../../

supabase functions deploy config
supabase functions deploy news
supabase functions deploy news-sync
supabase functions deploy preview
supabase functions deploy series

cd $CURRENT_DIR

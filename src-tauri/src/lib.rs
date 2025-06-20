mod database_init;

use std::{fs, path::PathBuf, sync::{Arc, Mutex, OnceLock}};
use chrono::{NaiveTime, NaiveDate};
use serde::{Deserialize};
use crate::database_init::Db;

static DB_PATH: OnceLock<PathBuf> = OnceLock::new();
static DB_INSTANCE: OnceLock<Arc<Mutex<Db>>> = OnceLock::new();

#[tauri::command]
fn init_db(path: String) -> Result<(), String> {
    let db_path = PathBuf::from(path);

    println!("DB path: {}", db_path.display());

    if DB_PATH.set(db_path.clone()).is_err() {
        return Err("Database path has already been set!".to_string());
    }

    // Ensure directory exists
    if !db_path.exists() {
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        // Create empty file
        fs::File::create(&db_path)
            .map_err(|e| format!("Failed to create file: {}", e))?;
    }

    // Initialize DB connection
    let db = Db::init(db_path.clone())
        .map_err(|e| format!("Failed to initialize DB: {}", e))?;

    DB_INSTANCE
        .set(Arc::new(Mutex::new(db)))
        .map_err(|_| "Database already initialized".to_string())?;

    Ok(())
}


pub fn get_db_path() -> &'static PathBuf {
    DB_PATH.get().expect("DB path not initialized")
}

pub fn init_db_path(path: String) {
    let _ = DB_PATH.set(PathBuf::from(path));
}

pub fn get_db_instance() -> &'static Arc<Mutex<Db>> {
    DB_INSTANCE.get().expect("DB instance not initialized")
}

#[derive(Deserialize,Debug)]
struct NewCasePayload {
    case_no: i32,
    nature_of_case: String,
    received_from: String, // New field for received_from
    time_slot: String,
    party1: String,
    party2: String,
    assigned_to: String,
}

#[tauri::command]
fn insert_case(payload: NewCasePayload) -> Result<usize, String>{
    
    print!("Inserting case: {:?}", payload);

    let db = get_db_instance();
    let db = db.lock().unwrap();

    let nature = serde_plain::from_str(&payload.nature_of_case)
        .map_err(|_| "Invalid nature_of_case".to_string())?;
    let time = NaiveTime::parse_from_str(&payload.time_slot, "%H:%M")
        .map_err(|_| "Invalid time format".to_string())?;

    db.insert_case(
        payload.case_no,
        nature,
        payload.received_from,
        time,
        payload.party1,
        payload.party2,
        payload.assigned_to,
    )
    .map_err(|e| e.to_string())
    .map(|res| {
        println!("Case inserted successfully: {:?}", payload.case_no);
        res
    })
}

#[derive(Deserialize, Debug)]
struct UpdatePayload {
    case_no: i32,
    ndoh_date: String,
    ndoh_time: String,
    disposal_of_case: String,
}

#[tauri::command]
fn update_case(payload: UpdatePayload) -> Result<usize, String> {

    println!("Updating case: {:?}", payload);

    let db = get_db_instance();
    let db = db.lock().unwrap();

    let ndoh_date = NaiveDate::parse_from_str(&payload.ndoh_date, "%Y-%m-%d")
        .map_err(|_| "Invalid date format".to_string())?;
    let ndoh_time = NaiveTime::parse_from_str(&payload.ndoh_time, "%H:%M")
        .map_err(|_| "Invalid time format".to_string())?;
    let disposal = serde_json::from_str(&format!("\"{}\"", payload.disposal_of_case))
        .map_err(|_| "Invalid disposal_of_case".to_string())?;

    db.update_case_details(payload.case_no, ndoh_date, ndoh_time, disposal)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_todays_cases() -> Result<Vec<database_init::Case>, String> {
    let db = get_db_instance();
    let db = db.lock().unwrap();

    db.get_cases_for_today().map_err(|e| e.to_string())
}

#[derive(Deserialize, Debug)]
struct CaseQueryPayLoad {
    nature_of_case: Option<String>,
    assigned_to: Option<String>,
    start_date: String,
    end_date: String,
    // end_date: String,
}

#[tauri::command]
fn query_cases_with_filters(
    payload : CaseQueryPayLoad
 ) -> Result<database_init::CaseQueryResult, String> {

    // print!("Querying cases with filters: nature_of_case: {:?}, assigned_to: {:?}", payload.nature_of_case, payload.assigned_to);

    
    let db = get_db_instance(); // Your global Arc<Mutex<Db>>
    let db = db.lock().unwrap();

    // Parse dates from strings
    let start = NaiveDate::parse_from_str(&payload.start_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid start_date: {}", e))?;
    let end = NaiveDate::parse_from_str(&payload.end_date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid end_date: {}", e))?;

    // Parse enum from string if provided
    let nature_enum = match payload.nature_of_case {
        Some(ref val) if !val.is_empty() => {
            Some(serde_json::from_str(&format!("\"{}\"", val)).map_err(|e| format!("Invalid case type: {}", e))?)
        }
        _ => None,
    };

    let result = db
        .query_cases_filtered(nature_enum, payload.assigned_to, start, end)
        .map_err(|e| e.to_string())?;

    // Ok(())

    Ok(database_init::CaseQueryResult {
        cases: result.0,
        summary: result.1,
    })
}




#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::new().target(tauri_plugin_log::Target::new(
        tauri_plugin_log::TargetKind::Stdout,
    )).build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
        init_db,
        insert_case,
        update_case,
        get_todays_cases,
        query_cases_with_filters
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");

}

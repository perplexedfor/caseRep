use chrono::{Datelike, Local, NaiveDate, NaiveTime};
use convert_case::{ Casing};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use serde_json::to_string;
use serde_plain;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Db {
    conn: Arc<Mutex<Connection>>,
}

impl Db {
    pub fn init(path: std::path::PathBuf) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.create_table()?;
        Ok(db)
    }

    fn create_table(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS case_table (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_no INTEGER NOT NULL,
                year INTEGER NOT NULL,
                nature_of_case TEXT NOT NULL,
                received_from TEXT NOT NULL,
                date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                party1 TEXT NOT NULL,
                party2 TEXT NOT NULL,
                assigned_to TEXT NOT NULL,
                ndoh_date TEXT,
                ndoh_time TEXT,
                disposal_of_case TEXT,
                connected INTEGER DEFAULT 0,
                UNIQUE (case_no, year)
            );",
            [],
        )?;


        conn.execute(
            "CREATE TABLE IF NOT EXISTS assigned_to (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );",
            [],
        )?;

        conn.execute(
            "INSERT OR IGNORE INTO assigned_to (name) VALUES
                ('Judge_In_Charge'),
                ('Sh_Surender_Singh'),
                ('Sh_Nishant_S_Dewan'),
                ('Ms_Shashi_Jaiswal'),
                ('Sh_Tarun_Shokeen'),
                ('Sh_Manmohan_Goel'),
                ('Sh_Anuj_Rajput'),
                ('Sh_S_K_Malik'),
                ('Ms_Indu_Shekhar'),
                ('Ms_Surinder_Kaur'),
                ('Sh_Muskesh_Goel'),
                ('Sh_Anil_Kumar_Chhabra'),
                ('Ms_Neeru_Nagpal'),
                ('Ms_Savita_Kasana'),
                ('Sh_O_P_Gupta'),
                ('Sh_Jagdish_Sethi'),
                ('Ms_Meenakshi_Juneja'),
                ('Sh_R_B_Singh'),
                ('Sh_Rajbir_Malik'),
                ('Ms_Nidhi_T_Raj'),
                ('Ms_Kavita_Kapil'),
                ('Ms_Jyotsna_Jena'),
                ('Sh_Chandra_Bose'),
                ('Sh_Naveen_Tayal'),
                ('Ms_Urmila_Yadav');",
            [],
        )?;

        Ok(())
    }

    pub fn insert_case(
        &self,
        case_no: i32,
        year: i32,
        nature_of_case: String,
        received_from: String,
        time_slot: NaiveTime,
        party1: String,
        party2: String,
        assigned_to: String,
    ) -> Result<usize> {
        let conn = self.conn.lock().unwrap();

        let date = NaiveDate::from_ymd_opt(
            Local::now().year(),
            Local::now().month(),
            Local::now().day(),
        )
        .expect("Failed to get current date");

        println!(
            "Inserting case: {} , year {} , Nature: {:?}, Received From: {}, Date: {}, Time Slot: {}, Party1: {}, Party2: {}, Assigned To: {}",
            case_no, year, nature_of_case, received_from, date, time_slot, party1, party2, assigned_to
        );

        let nature_of_case_str = to_string(&nature_of_case)
            .unwrap()
            .trim_matches('"')
            .to_string();

        conn.execute(
            "INSERT INTO case_table (
                case_no, year, nature_of_case, received_from, date, time_slot,
                party1, party2, assigned_to
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                case_no,
                year,
                nature_of_case_str,
                received_from,
                date.to_string(),
                time_slot.to_string(),
                party1,
                party2,
                assigned_to
            ],
        )?;

        Ok(conn.last_insert_rowid() as usize)
    }

    pub fn update_case_details(
        &self,
        case_no: i32,
        ndoh_date: NaiveDate,
        ndoh_time: NaiveTime,
        disposal_of_case: DisposalOfCase,
        connected: Option<i32>,
    ) -> Result<usize> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn.prepare("SELECT COUNT(*) FROM case_table WHERE case_no = ?1")?;
        let count: i64 = stmt.query_row([case_no], |row| row.get(0))?;

        if count == 0 {
            println!("No case found with case_no: {}", case_no);
            return Ok(0);
        }

        let disposal_str = to_string(&disposal_of_case)
            .unwrap()
            .trim_matches('"')
            .to_string();

        println!(
            "Updating case_no {} with NDOH date: {}, NDOH time: {}, Disposal: {}, Connected: {:?}",
            case_no, ndoh_date, ndoh_time, disposal_str, connected
        );
        //getting the current year
        let current_year = Local::now().year();

        let affected = conn.execute(
            "UPDATE case_table
             SET ndoh_date = ?1,
                 ndoh_time = ?2,
                 disposal_of_case = ?3,
                 connected = COALESCE(?5, connected)
             WHERE case_no = ?4 AND year = ?6",
            params![
                ndoh_date.to_string(),
                ndoh_time.to_string(),
                disposal_str,
                case_no,
                connected.unwrap_or(0),
                current_year
            ],
        )?;

        println!("Updated {} row(s) for case_no: {}", affected, case_no);
        Ok(affected)
    }

    pub fn get_cases_for_today(&self) -> Result<Vec<Case>> {
        let conn = self.conn.lock().unwrap();

        let today = NaiveDate::from_ymd_opt(
            Local::now().year(),
            Local::now().month(),
            Local::now().day(),
        )
        .expect("Invalid local date")
        .to_string();

        let mut stmt = conn.prepare(
            "SELECT id, case_no, nature_of_case,received_from, date, time_slot,
                    party1, party2, assigned_to, ndoh_date, ndoh_time, disposal_of_case, connected
             FROM case_table
             WHERE date = ?1 OR ndoh_date = ?1",
        )?;

        let case_iter = stmt.query_map(params![today], |row| {
            let nature_str: String = row.get(2)?;
            let disposal: Option<String> = row.get(11)?;
            let ndoh_date: Option<String> = row.get(9)?;
            let ndoh_time: Option<String> = row.get(10)?;
            let connected: i32 = row.get(12)?;

            Ok(Case {
                id: row.get(0)?,
                case_no: row.get(1)?,
                nature_of_case: nature_str,
                received_from: row.get(3)?,
                date: NaiveDate::parse_from_str(&row.get::<_, String>(4)?, "%Y-%m-%d")
                    .expect("Invalid date"),
                time_slot: NaiveTime::parse_from_str(&row.get::<_, String>(5)?, "%H:%M:%S")
                    .expect("Invalid time"),
                party1: row.get(6)?,
                party2: row.get(7)?,
                assigned_to: row.get(8)?,
                ndoh_date: ndoh_date
                    .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok()),
                ndoh_time: ndoh_time
                    .and_then(|s| NaiveTime::parse_from_str(&s, "%H:%M:%S").ok()),
                disposal_of_case: disposal
                    .and_then(|s| serde_plain::from_str(&s.to_case(convert_case::Case::Pascal)).ok()),
                connected,
            })
        })?;

        Ok(case_iter.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn query_cases_filtered(
        &self,
        nature_of_case: Option<String>,
        assigned_to: Option<String>,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<(Vec<Case>, CaseSummary)> {
        let conn = self.conn.lock().unwrap();

        println!(
            "Querying cases with filters: nature_of_case: {:?}, assigned_to: {:?}, start_date: {}, end_date: {}",
            nature_of_case, assigned_to, start_date, end_date
        );

        let mut query = String::from(
            "SELECT id, case_no, nature_of_case, received_from, date, time_slot, party1, party2, assigned_to, ndoh_date, ndoh_time, disposal_of_case, connected
            FROM case_table
            WHERE (date BETWEEN ?1 AND ?2 OR ndoh_date BETWEEN ?1 AND ?2)"
        );

        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![
            Box::new(start_date.to_string()),
            Box::new(end_date.to_string()),
        ];

        if let Some(ref nature) = nature_of_case {
            if !nature.is_empty() {
                query += " AND nature_of_case = ?";
                params.push(Box::new(nature.clone()));
            }
        }

        if let Some(name) = &assigned_to {
            query += " AND assigned_to = ?";
            params.push(Box::new(name.clone()));
        }

        let mut stmt = conn.prepare(&query)?;
        let params_ref: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();

        let case_iter = stmt.query_map(&params_ref[..], |row| {
            Ok(Case {
                id: row.get(0)?,
                case_no: row.get(1)?,
                nature_of_case: {
                    let val: String = row.get(2)?;
                    serde_plain::from_str(&val).unwrap_or_else(|_| {
                        println!("Failed to parse nature_of_case: {:?}", val);
                        Default::default() // or whatever default you prefer
                    })
                },
                received_from: row.get(3)?,
                date: {
                    let val: String = row.get(4)?;
                    NaiveDate::parse_from_str(&val, "%Y-%m-%d").unwrap_or_else(|_| {
                        println!("Failed to parse date: {:?}", val);
                        NaiveDate::from_ymd_opt(1970, 1, 1).unwrap()
                    })
                },
                time_slot: {
                    let val: String = row.get(5)?;
                    NaiveTime::parse_from_str(&val, "%H:%M").unwrap_or_else(|_| {
                        println!("Failed to parse time_slot: {:?}", val);
                        NaiveTime::from_hms_opt(0, 0, 0).unwrap()
                    })
                },
                party1: row.get(6)?,
                party2: row.get(7)?,
                assigned_to: row.get(8)?,
                ndoh_date: {
                    let val: Option<String> = row.get(9)?;
                    val.and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
                },
                ndoh_time: {
                    let val: Option<String> = row.get(10)?;
                    val.and_then(|s| NaiveTime::parse_from_str(&s, "%H:%M").ok())
                },
                disposal_of_case: {
                    let val: Option<String> = row.get(11)?;
                    val.and_then(|s| serde_plain::from_str(&s).ok())
                },
                connected: {
                    let val: i32 = row.get(12)?;
                    println!("Row ID: {}, Connected: {:?}", row.get::<_, i32>(0).unwrap_or(-1), val);
                    val
                },

            })
        })?;

        let cases: Vec<Case> = case_iter.collect::<Result<_, _>>()?;

        let mut summary = CaseSummary {
            settled: 0,
            not_settled: 0,
            not_fit: 0,
            pending: 0,
        };

        for case in &cases {
            match case.disposal_of_case {
                Some(DisposalOfCase::Settled) => summary.settled += 1,
                Some(DisposalOfCase::NotSettled) => summary.not_settled += 1,
                Some(DisposalOfCase::NotFitForMediation) => summary.not_fit += 1,
                Some(DisposalOfCase::Pending) => summary.pending += 1,
                _ => {}
            }
        }

        Ok((cases, summary))
    }


    pub fn get_assigned_to_list(&self) -> Result<Vec<String>, String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT name FROM assigned_to")
            .map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;

        let names = rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(names)
    }

    pub fn add_assigned_to(&self, name: String) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO assigned_to (name) VALUES (?1)",
            [name],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_assigned_to(&self, name: String) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM assigned_to WHERE name = ?1",
            [name],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }
}


#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum DisposalOfCase {
    Settled,
    NotSettled,
    NotFitForMediation,
    Pending
}

#[derive(Debug, Serialize)]
pub struct Case {
    id: i32,
    case_no: i32,
    nature_of_case: String,
    received_from: String,
    date: NaiveDate,
    time_slot: NaiveTime,
    party1: String,
    party2: String,
    assigned_to: String,
    ndoh_date: Option<NaiveDate>,
    ndoh_time: Option<NaiveTime>,
    disposal_of_case: Option<DisposalOfCase>,
    connected: i32,
}

#[derive(Serialize)]
pub struct CaseSummary {
    pub settled: usize,
    pub not_settled: usize,
    pub not_fit: usize,
    pub pending: usize,
}

#[derive(Serialize)]
pub struct CaseQueryResult {
    pub cases: Vec<Case>,
    pub summary: CaseSummary,
}

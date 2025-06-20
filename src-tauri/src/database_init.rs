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
                case_no INTEGER NOT NULL UNIQUE,
                nature_of_case TEXT NOT NULL,
                received_from TEXT NOT NULL,
                date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                party1 TEXT NOT NULL,
                party2 TEXT NOT NULL,
                assigned_to TEXT NOT NULL,
                ndoh_date TEXT,
                ndoh_time TEXT,
                disposal_of_case TEXT
            );",
            [],
        )?;
        Ok(())
    }

    pub fn insert_case(
        &self,
        case_no: i32,
        nature_of_case: NatureOfCase,
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

        let nature_of_case_str = to_string(&nature_of_case)
            .unwrap()
            .trim_matches('"')
            .to_string();

        conn.execute(
            "INSERT INTO case_table (
                case_no, nature_of_case, received_from, date, time_slot,
                party1, party2, assigned_to
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                case_no,
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
            "Updating case_no {} with NDOH date: {}, NDOH time: {}, Disposal: {}",
            case_no, ndoh_date, ndoh_time, disposal_str
        );

        let affected = conn.execute(
            "UPDATE case_table
             SET ndoh_date = ?1,
                 ndoh_time = ?2,
                 disposal_of_case = ?3
             WHERE case_no = ?4",
            params![
                ndoh_date.to_string(),
                ndoh_time.to_string(),
                disposal_str,
                case_no
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
                    party1, party2, assigned_to, ndoh_date, ndoh_time, disposal_of_case
             FROM case_table
             WHERE date = ?1",
        )?;

        let case_iter = stmt.query_map(params![today], |row| {
            let nature_str: String = row.get(2)?;
            let disposal: Option<String> = row.get(11)?;
            let ndoh_date: Option<String> = row.get(9)?;
            let ndoh_time: Option<String> = row.get(10)?;


            Ok(Case {
                id: row.get(0)?,
                case_no: row.get(1)?,
                nature_of_case: serde_plain::from_str(&nature_str.to_case(convert_case::Case::Pascal))
                    .expect("Invalid enum string"),
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
            })
        })?;

        Ok(case_iter.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn query_cases_filtered(
        &self,
        nature_of_case: Option<NatureOfCase>,
        assigned_to: Option<String>,
        start_date: NaiveDate,
        end_date: NaiveDate,
    ) -> Result<(Vec<Case>, CaseSummary)>{
        let conn = self.conn.lock().unwrap();
        
        print!("Querying cases with filters: nature_of_case: {:?}, assigned_to: {:?}, start_date: {}, end_date: {}", nature_of_case, assigned_to, start_date, end_date);

        let mut query = String::from("SELECT id, case_no, nature_of_case, date, time_slot, party1, party2, assigned_to, ndoh_date, ndoh_time, disposal_of_case FROM case_table WHERE date BETWEEN ?1 AND ?2");
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![
            Box::new(start_date.to_string()),
            Box::new(end_date.to_string()),
        ];

        if let Some(noc) = &nature_of_case {
            query += " AND nature_of_case = ?3";
            params.push(Box::new(to_string(noc).unwrap().trim_matches('"').to_string()));
        }

        if let Some(name) = &assigned_to {
            query += if params.len() == 3 { " AND assigned_to = ?4" } else { " AND assigned_to = ?3" };
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
                    serde_plain::from_str(&val.to_case(convert_case::Case::Pascal)).unwrap()
                },
                received_from: row.get(3)?,
                date: {
                    let val: String = row.get(4)?;
                    NaiveDate::parse_from_str(&val, "%Y-%m-%d").unwrap()
                },
                time_slot: {
                    let val: String = row.get(5)?;
                    NaiveTime::parse_from_str(&val, "%H:%M").unwrap()
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
                    val.and_then(|s| serde_plain::from_str(&s.to_case(convert_case::Case::Pascal)).ok())
                },
            })
        })?;

        let cases: Vec<Case> = case_iter.collect::<Result<_, _>>()?;

        let mut summary = CaseSummary {
            settled: 0,
            not_settled: 0,
            not_fit: 0,
            connected: 0
        };

        for case in &cases {
            match case.disposal_of_case {
                Some(DisposalOfCase::Settled) => summary.settled += 1,
                Some(DisposalOfCase::NotSettled) => summary.not_settled += 1,
                Some(DisposalOfCase::NotFitForMediation) => summary.not_fit += 1,
                Some(DisposalOfCase::Connected) => summary.connected += 1,
                _ => {}
            }
        }

        Ok((cases, summary))
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum NatureOfCase {
    CivilRecovery,
    CivilPartition,
    CivilInjunction,
    CivilPossession,
    CivilProbate,
    Arbitration,
    CivilAppeal,
    CivilExecution,
    OtherCivilSuit,
    CriminalMatter,
    CriminalRevision,
    CriminalAppeal,
    PetitionForDivorce,
    PetitionForMaintenance,
    PetitionForCustody,
    PetitionForDomesticVoilenceAct,
    CAWCellN,
    CawCellOD,
    PetitionForRecoveryOfRent,
    PetitionUs138OfNiActNPasaAct,
    PetitionUnderElectricityAct,
    MactCase,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum DisposalOfCase {
    Settled,
    NotSettled,
    NotFitForMediation,
    Connected,
}

#[derive(Debug, Serialize)]
pub struct Case {
    id: i32,
    case_no: i32,
    nature_of_case: NatureOfCase,
    received_from: String,
    date: NaiveDate,
    time_slot: NaiveTime,
    party1: String,
    party2: String,
    assigned_to: String,
    ndoh_date: Option<NaiveDate>,
    ndoh_time: Option<NaiveTime>,
    disposal_of_case: Option<DisposalOfCase>,
}

#[derive(Serialize)]
pub struct CaseSummary {
    pub settled: usize,
    pub not_settled: usize,
    pub not_fit: usize,
    pub connected: usize,
}

#[derive(Serialize)]
pub struct CaseQueryResult {
    pub cases: Vec<Case>,
    pub summary: CaseSummary,
}

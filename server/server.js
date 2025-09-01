// =============================================================================
// Main Backend Server File for Air Defense System
// =============================================================================

// 1. Import necessary packages
require('dotenv').config(); // Loads the .env file credentials
const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');

// 2. Configure the server
const app = express();
const PORT = process.env.PORT || 5000; // The server will run on port 5000
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json()); // Allows the server to understand JSON data

// 3. Database Connection Configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
};

// =============================================================================
// API Routes
// =============================================================================

// 4. API Route: Get Radar Stations
app.get('/api/radars', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/radars');

        const result = await connection.execute(
            `SELECT radar_id, station_name, latitude, longitude, operational_status FROM radar_stations`
        );
        res.json(result.rows);

    } catch (err) {
        console.error('Error fetching radar stations:', err);
        res.status(500).json({ error: 'Failed to fetch data from the database' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/radars');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 5. API Route: User Login
app.post('/api/login', async (req, res) => {
    let connection;
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/login');

        const result = await connection.execute(
            `SELECT operator_id, username, role, password_hash FROM operator_login_access WHERE username = :username`,
            { username: username },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // --- DANGER: INSECURE PASSWORD CHECK FOR DEMO PURPOSES ONLY ---
        const expectedPlaceholderHash = user.USERNAME === 'admin' ? 'placeholder_hash_for_admin' : 'placeholder_hash_for_op1';

        if (password === 'password123' && user.PASSWORD_HASH === expectedPlaceholderHash) { // THIS IS INSECURE
            await connection.execute(
                `UPDATE operator_login_access SET last_login_time = CURRENT_TIMESTAMP WHERE operator_id = :operator_id`,
                { operator_id: user.OPERATOR_ID }
            );
            await connection.commit();

            res.json({
                message: 'Login successful',
                operator: {
                    id: user.OPERATOR_ID,
                    username: user.USERNAME,
                    role: user.ROLE
                }
            });
        } else {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Login failed due to server error.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/login');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 6. API Route: Detect Aircraft and Auto-Classify Threat
app.post('/api/aircraft/detect', async (req, res) => {
    let connection;
    try {
        const {
            aircraft_identifier,
            latitude,
            longitude,
            altitude_ft,
            speed_kts,
            heading_deg,
            radar_id
        } = req.body;

        if (!aircraft_identifier || !latitude || !longitude || !altitude_ft || !speed_kts || !heading_deg || !radar_id) {
            return res.status(400).json({ error: 'All aircraft detection fields are required.' });
        }

        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/aircraft/detect');

        const insertAircraftSql = `
            INSERT INTO detected_aircraft (aircraft_identifier, latitude, longitude, altitude_ft, speed_kts, heading_deg, radar_id)
            VALUES (:aircraft_identifier, :latitude, :longitude, :altitude_ft, :speed_kts, :heading_deg, :radar_id)
            RETURNING detection_id INTO :detection_id`;

        const aircraftBind = {
            aircraft_identifier,
            latitude,
            longitude,
            altitude_ft,
            speed_kts,
            heading_deg,
            radar_id,
            detection_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };

        const aircraftResult = await connection.execute(insertAircraftSql, aircraftBind, { autoCommit: false });
        const detectionId = aircraftResult.outBinds.detection_id[0];

        let assignedThreatLevel = 'Unknown';
        let ruleId = null;

        const rulesResult = await connection.execute(
            `SELECT rule_id, parameter_name, operator, value, assigned_threat_level
             FROM threat_classification_rules
             WHERE is_enabled = 1`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        for (const rule of rulesResult.rows) {
            let matches = false;
            const paramValue = req.body[rule.PARAMETER_NAME.toLowerCase()];

            if (paramValue !== undefined) {
                switch (rule.OPERATOR) {
                    case '<':
                        matches = paramValue < rule.VALUE;
                        break;
                    case '>':
                        matches = paramValue > rule.VALUE;
                        break;
                    case '=':
                        matches = paramValue === rule.VALUE;
                        break;
                    default:
                        break;
                }
            }

            if (matches) {
                assignedThreatLevel = rule.ASSIGNED_THREAT_LEVEL;
                ruleId = rule.RULE_ID;
                break;
            }
        }

        const insertThreatSql = `
            INSERT INTO classified_threats (detection_id, threat_level, source, rule_id)
            VALUES (:detection_id, :threat_level, :source, :rule_id)`;

        const threatBind = {
            detection_id: detectionId,
            threat_level: assignedThreatLevel,
            source: 'Auto-classified',
            rule_id: ruleId
        };

        await connection.execute(insertThreatSql, threatBind, { autoCommit: false });

        await connection.commit();

        res.status(201).json({
            message: 'Aircraft detected and classified successfully',
            detection_id: detectionId,
            aircraft_identifier: aircraft_identifier,
            initial_threat_level: assignedThreatLevel
        });

    } catch (err) {
        console.error('Error detecting aircraft:', err);
        if (connection) {
            try {
                await connection.rollback();
                console.log('Transaction rolled back.');
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).json({ error: 'Failed to detect aircraft due to server error.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/aircraft/detect');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 7. API Route: Get All Detected Aircraft with Threat Levels
app.get('/api/aircraft/all', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/aircraft/all');

        const result = await connection.execute(
            `SELECT
                da.detection_id,
                da.aircraft_identifier,
                TO_CHAR(da.detection_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS TZH:TZM') AS detection_time,
                da.latitude,
                da.longitude,
                da.altitude_ft,
                da.speed_kts,
                da.heading_deg,
                rs.station_name as radar_station_name,
                ct.threat_level,
                TO_CHAR(ct.classification_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS TZH:TZM') AS classification_time,
                ct.source,
                ct.threat_id
             FROM
                detected_aircraft da
             JOIN
                radar_stations rs ON da.radar_id = rs.radar_id
             JOIN
                classified_threats ct ON da.detection_id = ct.detection_id
             ORDER BY
                da.detection_time DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);

    } catch (err) {
        console.error('Error fetching all detected aircraft:', err);
        res.status(500).json({ error: 'Failed to fetch detected aircraft data.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/aircraft/all');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// 8. API Route: Operator Override Threat Level
app.patch('/api/threats/:threatId/override', async (req, res) => {
    let connection;
    try {
        const threatId = parseInt(req.params.threatId);
        const { newThreatLevel, operatorId } = req.body;

        if (!threatId || isNaN(threatId) || !newThreatLevel || !operatorId || isNaN(operatorId)) {
            return res.status(400).json({ error: 'Valid threatId, newThreatLevel, and operatorId are required.' });
        }

        const allowedThreatLevels = ['Unknown', 'Low', 'Moderate', 'High', 'Critical'];
        if (!allowedThreatLevels.includes(newThreatLevel)) {
            return res.status(400).json({ error: 'Invalid newThreatLevel provided.' });
        }

        connection = await oracledb.getConnection(dbConfig);
        console.log(`Database connected for /api/threats/${threatId}/override`);

        const updateThreatSql = `
            UPDATE classified_threats
            SET
                threat_level = :newThreatLevel,
                source = 'Operator Override',
                classification_time = CURRENT_TIMESTAMP,
                operator_id = :operatorId
            WHERE
                threat_id = :threatId`;

        const bindVars = {
            newThreatLevel: newThreatLevel,
            operatorId: operatorId,
            threatId: threatId
        };

        const result = await connection.execute(updateThreatSql, bindVars, { autoCommit: true });

        if (result.rowsAffected && result.rowsAffected === 1) {
            res.json({
                message: `Threat ID ${threatId} updated to ${newThreatLevel} by operator ${operatorId}.`,
                threatId: threatId,
                newThreatLevel: newThreatLevel
            });
        } else {
            res.status(404).json({ error: `Threat with ID ${threatId} not found.` });
        }

    } catch (err) {
        console.error('Error overriding threat level:', err);
        res.status(500).json({ error: 'Failed to override threat level due to server error.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log(`Database connection closed for /api/threats/${threatId}/override`);
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 9. API Route: Get Available Missiles
app.get('/api/missiles/available', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/missiles/available');

        const result = await connection.execute(
            `SELECT missile_id, missile_type, serial_number FROM missile_inventory WHERE status = 'Available'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);

    } catch (err) {
        console.error('Error fetching available missiles:', err);
        res.status(500).json({ error: 'Failed to fetch available missile data.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/missiles/available');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 10. API Route: Initiate Interception and Create Incident Report
app.post('/api/interceptions', async (req, res) => {
    let connection;
    try {
        const { threatId, missileId, operatorId, interceptionNotes } = req.body;

        if (!threatId || isNaN(threatId) || !missileId || isNaN(missileId) || !operatorId || isNaN(operatorId)) {
            return res.status(400).json({ error: 'Valid threatId, missileId, and operatorId are required for interception.' });
        }

        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/interceptions');

        const insertLogSql = `
            INSERT INTO interception_log (threat_id, missile_id, operator_id, result_details)
            VALUES (:threat_id, :missile_id, :operator_id, :result_details)
            RETURNING log_id INTO :log_id`;

        const logBind = {
            threat_id: threatId,
            missile_id: missileId,
            operator_id: operatorId,
            result_details: interceptionNotes || 'Interception initiated',
            log_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };

        const logResult = await connection.execute(insertLogSql, logBind, { autoCommit: false });
        const logId = logResult.outBinds.log_id[0];

        const updateMissileSql = `
            UPDATE missile_inventory
            SET status = 'Used'
            WHERE missile_id = :missile_id AND status = 'Available'`;

        const updateMissileResult = await connection.execute(updateMissileSql, { missile_id: missileId }, { autoCommit: false });

        if (updateMissileResult.rowsAffected && updateMissileResult.rowsAffected === 1) {
            const incidentDetailsResult = await connection.execute(
                `SELECT
                    da.aircraft_identifier,
                    ct.threat_level,
                    mi.missile_type,
                    ola.username AS launching_operator_username
                 FROM
                    detected_aircraft da
                 JOIN
                    classified_threats ct ON da.detection_id = ct.detection_id
                 JOIN
                    missile_inventory mi ON mi.missile_id = :missile_id_lookup
                 JOIN
                    operator_login_access ola ON ola.operator_id = :operator_id_lookup
                 WHERE
                    ct.threat_id = :threat_id_lookup`,
                {
                    missile_id_lookup: missileId,
                    operator_id_lookup: operatorId,
                    threat_id_lookup: threatId
                },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const details = incidentDetailsResult.rows[0];

            if (!details) {
                await connection.rollback();
                return res.status(404).json({ error: 'Could not find all details for incident report generation.' });
            }

            const insertIncidentSql = `
                INSERT INTO incident_reports (
                    log_id,
                    incident_time,
                    aircraft_identifier,
                    threat_level_at_incident,
                    missile_type_used,
                    launching_operator_username,
                    interception_result,
                    report_summary
                )
                VALUES (
                    :log_id,
                    CURRENT_TIMESTAMP,
                    :aircraft_identifier,
                    :threat_level_at_incident,
                    :missile_type_used,
                    :launching_operator_username,
                    'Pending',
                    :report_summary
                )`;

            const incidentBind = {
                log_id: logId,
                aircraft_identifier: details.AIRCRAFT_IDENTIFIER,
                threat_level_at_incident: details.THREAT_LEVEL,
                missile_type_used: details.MISSILE_TYPE,
                launching_operator_username: details.LAUNCHING_OPERATOR_USERNAME,
                report_summary: `Interception initiated against ${details.AIRCRAFT_IDENTIFIER} (Threat: ${details.THREAT_LEVEL}) using ${details.MISSILE_TYPE} by ${details.LAUNCHING_OPERATOR_USERNAME}.`
            };

            await connection.execute(insertIncidentSql, incidentBind, { autoCommit: false });

            await connection.commit();

            res.status(201).json({
                message: 'Interception initiated and incident report created successfully.',
                logId: logId,
                threatId: threatId,
                missileId: missileId
            });
        } else {
            await connection.rollback();
            return res.status(409).json({ error: 'Selected missile is not available or does not exist.' });
        }

    } catch (err) {
        console.error('Error initiating interception or creating incident report:', err);
        if (connection) {
            try {
                await connection.rollback();
                console.error('Error during rollback:', rbErr);
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
            }
        }
        res.status(500).json({ error: 'Failed to initiate interception or create incident report due to server error.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/interceptions');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 11. API Route: Get All Incident Reports
app.get('/api/incidents/all', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/incidents/all');

        const result = await connection.execute(
            `SELECT
                ir.report_id,
                ir.log_id,
                TO_CHAR(ir.incident_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS TZH:TZM') AS incident_time,
                ir.aircraft_identifier,
                ir.threat_level_at_incident,
                ir.missile_type_used,
                ir.launching_operator_username,
                ir.interception_result,
                ir.report_summary,
                il.result_details AS interception_details
             FROM
                incident_reports ir
             JOIN
                interception_log il ON ir.log_id = il.log_id
             ORDER BY
                ir.incident_time DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);

    } catch (err) {
        console.error('Error fetching incident reports:', err);
        res.status(500).json({ error: 'Failed to fetch incident reports.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/incidents/all');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 12. API Route: Get All Automated Alerts
app.get('/api/alerts/automated', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/alerts/automated');

        const result = await connection.execute(
            `SELECT
                aa.alert_id,
                aa.threat_id,
                TO_CHAR(aa.alert_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS TZH:TZM') AS alert_time,
                aa.reason,
                aa.is_acknowledged,
                da.aircraft_identifier,
                ct.threat_level
             FROM
                automated_alerts aa
             JOIN
                classified_threats ct ON aa.threat_id = ct.threat_id
             JOIN
                detected_aircraft da ON ct.detection_id = da.detection_id
             ORDER BY
                aa.alert_time DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);

    } catch (err) {
        console.error('Error fetching automated alerts:', err);
        res.status(500).json({ error: 'Failed to fetch automated alerts.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/alerts/automated');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 13. API Route: Generate Alert for an Unintercepted High/Critical Threat
app.post('/api/alerts/generate-unintercepted-threat-alert', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/alerts/generate-unintercepted-threat-alert');

        // Find a high/critical threat that has NOT been intercepted and does NOT already have an active alert
        const findThreatSql = `
            SELECT
                ct.threat_id,
                da.aircraft_identifier,
                ct.threat_level
            FROM
                (
                    SELECT
                        ct_inner.threat_id,
                        da.aircraft_identifier,
                        ct_inner.threat_level
                    FROM
                        classified_threats ct_inner
                    JOIN
                        detected_aircraft da ON ct_inner.detection_id = da.detection_id
                    LEFT JOIN
                        interception_log il ON ct_inner.threat_id = il.threat_id
                    WHERE
                        il.threat_id IS NULL -- Not yet intercepted
                        AND ct_inner.threat_level IN ('High', 'Critical') -- Is a high/critical threat
                ) ct
            LEFT JOIN
                automated_alerts aa ON ct.threat_id = aa.threat_id
            WHERE
                aa.threat_id IS NULL -- Does not already have an alert
            AND ROWNUM = 1 -- Get only one such threat
        `;

        const threatToAlertResult = await connection.execute(findThreatSql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const threatToAlert = threatToAlertResult.rows[0];

        if (!threatToAlert) {
            return res.status(404).json({ message: 'No unintercepted high/critical threats found to generate an alert for.' });
        }

        // Insert into automated_alerts
        const insertAlertSql = `
            INSERT INTO automated_alerts (threat_id, alert_time, reason, is_acknowledged)
            VALUES (:threat_id, CURRENT_TIMESTAMP, :reason, 0)
            RETURNING alert_id INTO :alert_id`;

        const alertBind = {
            threat_id: threatToAlert.THREAT_ID,
            reason: `Unintercepted ${threatToAlert.THREAT_LEVEL} threat detected: ${threatToAlert.AIRCRAFT_IDENTIFIER}.`,
            alert_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };

        const insertResult = await connection.execute(insertAlertSql, alertBind, { autoCommit: true });
        const alertId = insertResult.outBinds.alert_id[0];

        res.status(201).json({
            message: `Alert generated for threat ${threatToAlert.THREAT_ID} (${threatToAlert.AIRCRAFT_IDENTIFIER}).`,
            alertId: alertId,
            threatId: threatToAlert.THREAT_ID,
            aircraftIdentifier: threatToAlert.AIRCRAFT_IDENTIFIER
        });

    } catch (err) {
        console.error('Error generating automated alert:', err);
        res.status(500).json({ error: 'Failed to generate automated alert due to server error.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/alerts/generate-unintercepted-threat-alert');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 14. API Route: Get Region Surveillance Summary
app.get('/api/surveillance/summary', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/surveillance/summary');

        const summarySql = `
            SELECT
                rs.station_name,
                rs.operational_status,
                COUNT(DISTINCT da.detection_id) AS detected_aircraft_count,
                COUNT(CASE WHEN ct.threat_level IN ('High', 'Critical') THEN ct.threat_id ELSE NULL END) AS high_threat_count,
                MAX(da.altitude_ft) AS max_altitude_ft,
                MIN(da.altitude_ft) AS min_altitude_ft,
                COALESCE(AVG(da.speed_kts), 0) AS avg_speed_kts
            FROM
                radar_stations rs
            LEFT JOIN
                detected_aircraft da ON rs.radar_id = da.radar_id
            LEFT JOIN
                classified_threats ct ON da.detection_id = ct.detection_id
            GROUP BY
                rs.station_name, rs.operational_status
            ORDER BY
                rs.station_name`;

        const result = await connection.execute(summarySql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json(result.rows);

    } catch (err) {
        console.error('Error fetching surveillance summary:', err);
        res.status(500).json({ error: 'Failed to fetch surveillance summary.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/surveillance/summary');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 15. API Route: Add New Missile (with max limit of 16)
app.post('/api/missiles/add', async (req, res) => {
    let connection;
    try {
        const { missile_type } = req.body;

        if (!missile_type) {
            return res.status(400).json({ error: 'Missile type is required.' });
        }

        connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected for /api/missiles/add');

        const countResult = await connection.execute(
            `SELECT COUNT(*) AS total_missiles FROM missile_inventory`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const totalMissiles = countResult.rows[0].TOTAL_MISSILES;
        const MAX_MISSILES = 16;

        if (totalMissiles >= MAX_MISSILES) {
            return res.status(403).json({ error: `Cannot add more missiles. Maximum limit of ${MAX_MISSILES} reached.` });
        }

        const serialNumber = `${missile_type.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        const insertMissileSql = `
            INSERT INTO missile_inventory (missile_type, serial_number, status, last_maintenance_date)
            VALUES (:missile_type, :serial_number, 'Available', CURRENT_DATE)
            RETURNING missile_id INTO :missile_id`;

        const bindVars = {
            missile_type: missile_type,
            serial_number: serialNumber,
            missile_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };

        const result = await connection.execute(insertMissileSql, bindVars, { autoCommit: true });
        const missileId = result.outBinds.missile_id[0];

        res.status(201).json({
            message: `Missile '${missile_type}' (SN: ${serialNumber}) added successfully.`,
            missile: {
                missile_id: missileId,
                missile_type: missile_type,
                serial_number: serialNumber,
                status: 'Available'
            }
        });

    } catch (err) {
        console.error('Error adding new missile:', err);
        res.status(500).json({ error: 'Failed to add new missile due to server error.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Database connection closed for /api/missiles/add');
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// 16. API Route: Acknowledge Automated Alert
app.patch('/api/alerts/:alertId/acknowledge', async (req, res) => {
    let connection;
    try {
        const alertId = parseInt(req.params.alertId);
        const { operatorId } = req.body;

        if (!alertId || isNaN(alertId) || !operatorId || isNaN(operatorId)) {
            return res.status(400).json({ error: 'Valid alertId and operatorId are required.' });
        }

        connection = await oracledb.getConnection(dbConfig);
        console.log(`Database connected for /api/alerts/${alertId}/acknowledge`);

        const updateAlertSql = `
            UPDATE automated_alerts
            SET
                is_acknowledged = 1,
                acknowledged_by_operator_id = :operatorId
            WHERE
                alert_id = :alertId
                AND is_acknowledged = 0`;

        const bindVars = {
            operatorId: operatorId,
            alertId: alertId
        };

        const result = await connection.execute(updateAlertSql, bindVars, { autoCommit: true });

        if (result.rowsAffected && result.rowsAffected === 1) {
            res.json({
                message: `Alert ID ${alertId} acknowledged by operator ${operatorId}.`,
                alertId: alertId,
                is_acknowledged: 1
            });
        } else {
            res.status(404).json({ error: `Alert with ID ${alertId} not found or already acknowledged.` });
        }

    } catch (err) {
        console.error('Error acknowledging alert:', err);
        res.status(500).json({ error: 'Failed to acknowledge alert due to server error.' });
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log(`Database connection closed for /api/alerts/${alertId}/acknowledge`);
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});


// =============================================================================
// Server Startup
// =============================================================================

// 17. Start the Server
async function startServer() {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log('Database connected successfully!');
        await connection.close();

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    }
}

startServer();
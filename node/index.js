/*var mysql = require('mysql');
var mqtt = require('mqtt');

//CREDENCIALES MYSQL
var con = mysql.createConnection({
  host: "univalleiot.ga",
  user: "admin_cursoiot",
  password: "123456",
  database: "admin_cursoiot"
});

//CREDENCIALES MQTT
var options = {
  port: 1883,
  host: 'univalleiot.ga',
  clientId: 'acces_control_server_' + Math.round(Math.random() * (0- 10000) * -1) ,
  username: 'web_client',
  password: '123456',
  keepalive: 60,
  reconnectPeriod: 1000,
  protocolId: 'MQIsdp',
  protocolVersion: 3,
  clean: true,
  encoding: 'utf8'
};

var client = mqtt.connect("mqtt://univalleiot.ga", options);

//SE REALIZA LA CONEXION
client.on('connect', function () {
  console.log("Conexión  MQTT Exitosa!");
  client.subscribe('+/#', function (err) {
   console.log("Subscripción exitosa!")
  });
})

//CUANDO SE RECIBE MENSAJE
client.on('message', function (topic, message) {
  console.log("Mensaje recibido desde -> " + topic + " Mensaje -> " + message.toString());
  if (topic == "values"){
    var msg = message.toString();
    var sp = msg.split(",");
    var temp1 = sp[0];
    var temp2 = sp[1];
    var volts = sp[2];

    //hacemos la consulta para insertar....
    var query = "INSERT INTO `admin_cursoiot`.`data` (`data_temp1`, `data_temp2`, `data_volts`) VALUES (" + temp1 + ", " + temp2 + ", " + volts + ");";
    con.query(query, function (err, result, fields) {
      if (err) throw err;
      console.log("Fila insertada correctamente");
    });
  }
});




//nos conectamos
con.connect(function(err){
  if (err) throw err;

  //una vez conectados, podemos hacer consultas.
  console.log("Conexión a MYSQL exitosa!!!")

  //hacemos la consulta
    //var query = "SELECT * FROM devices WHERE 1";
    //con.query(query, function (err, result, fields) {
    //if (err) throw err;
   // if(result.length>0){
   //   console.log(result);
  //  }
  //});

});



//para mantener la sesión con mysql abierta
setInterval(function () {
  var query ='SELECT 1 + 1 as result';

  con.query(query, function (err, result, fields) {
    if (err) throw err;
  });

}, 5000);*/

const mysql = require("mysql");

const mqtt = require("mqtt");

// Credenciales MySQL

const con = mysql.createConnection({

  host: "samay.services",

  user: "admin_samay",

  password: "paty123",

  database: "admin_samay"

});

// Variable global para almacenar el person_id activo

let activePersonId = null;

// Credenciales MQTT

const options = {

  port: 8084,

  host: "n63cee2f.ala.us-east-1.emqxsl.com",

  clientId: "samay_storage_" + Math.round(Math.random() * (0 - 10000) * -1),

  username: "RCP",

  password: "1234567890",

  protocol: "wss",

  keepalive: 60,

  reconnectPeriod: 1000,

  clean: true,

  encoding: "utf8"

};

const client = mqtt.connect('wss://n63cee2f.ala.us-east-1.emqxsl.com:8084/mqtt', options);

// Función para crear o obtener person_id

function ensureActivePerson(callback) {

  if (!activePersonId) {

    const today = new Date().toISOString().slice(0, 10);

    const personName = `Session_${today}`;

    con.query(

      'INSERT INTO person (name, usage_date) VALUES (?, ?)',

      [personName, today],

      function (err, results) {

        if (err) {

          console.error("Error creating person record:", err);

          callback(err, null);

          return;

        }

        activePersonId = results.insertId;

        console.log(`Nueva sesión creada con ID: ${activePersonId}`);

        callback(null, activePersonId);

      }

    );

  } else {

    callback(null, activePersonId);

  }

}

// Conexión MQTT

client.on("connect", function () {

  console.log("Conexión MQTT Exitosa!");

  client.subscribe([

    'led/status',

    'button/press_count',

    'sensor/distance',

    'sensor/resta'

  ], function (err) {

    if (!err) {

      console.log("Subscripción exitosa a todos los temas!");

      // Crear nueva sesión al conectar

      ensureActivePerson((err) => {

        if (err) console.error("Error al crear sesión inicial:", err);

      });

    }

  });

});

// Manejo de mensajes MQTT

client.on("message", function (topic, message) {

  console.log("Mensaje recibido desde -> " + topic + " Mensaje -> " + message.toString());

  ensureActivePerson((err, personId) => {

    if (err) {

      console.error("Error al obtener person_id:", err);

      return;

    }

    const value = parseFloat(message.toString());

    let query = "";

    let params = [];

    switch (topic) {

      case 'led/status':

        // Almacenar frecuencia de compresión

        query = 'INSERT INTO frequency (value, person_id) VALUES (?, ?)';

        params = [value, personId];

        break;

      case 'button/press_count':

        // Almacenar conteo de pulsos

        query = 'INSERT INTO pulse (value, person_id) VALUES (?, ?)';

        params = [Math.round(value), personId];

        break;

      case 'sensor/resta':

        // Almacenar distancia

        query = 'INSERT INTO distance (value, person_id) VALUES (?, ?)';

        params = [Math.round(value), personId];

        break;

    }

    if (query && params.length > 0) {

      con.query(query, params, function (err, result) {

        if (err) {

          console.error("Error al insertar dato:", err);

        } else {

          console.log(`Dato insertado correctamente en ${topic.split('/')[1]}`);

        }

      });

    }

  });

});

// Manejo de errores MQTT

client.on("error", function (error) {

  console.error("Error de conexión MQTT:", error);

});

client.on("reconnect", function () {

  console.log("Intentando reconexión MQTT...");

  // Resetear person_id en reconexión para potencialmente crear nueva sesión

  activePersonId = null;

});

// Conexión MySQL con reconexión automática

function handleDisconnect() {

  con.connect(function (err) {

    if (err) {

      console.error('Error al conectar a la base de datos:', err);

      setTimeout(handleDisconnect, 2000);

    } else {

      console.log("Conexión MySQL exitosa!");

    }

  });

  con.on('error', function (err) {

    console.error('Error de base de datos:', err);

    if (err.code === 'PROTOCOL_CONNECTION_LOST') {

      handleDisconnect();

    } else {

      throw err;

    }

  });

}

handleDisconnect();

// Mantener conexión MySQL activa

setInterval(function () {

  con.query("SELECT 1", function (err) {

    if (err) {

      console.error("Error en keep-alive MySQL:", err);

    }

  });

}, 60000);

// Manejo de cierre limpio

process.on('SIGINT', function () {

  con.end(function () {

    console.log("Conexión MySQL cerrada");

    process.exit();

  });

});


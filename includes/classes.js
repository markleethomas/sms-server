const EventEmitter = require('events');

/**Smsserver */

class Smsserver extends EventEmitter{

  constructor(status, wss) {
    super();
    this.mysql = require('mysql');
    const WebSocket = require('ws');
  
    //This array is to store information about the health of the server.
    status = {'socket_status': ''}
    this.WebSocket = require('ws');
    this.config = require('config');
    this.wsConfig = this.config.get('websocket');
    this.dbConfig = this.config.get('mysql.dbConfig');
    this.wss = new WebSocket.Server(this.wsConfig);
    this.con = this.mysql.createConnection(this.dbConfig);
    this.clients = '';

    this.listen();
    wss = this.wss;
    //If the socket comes up and it's listening then update health status
    this.wss.on('listening', function(){
      status['socket_status'] = `listening`;
      console.log('Socket listening');
      console.log(JSON.stringify(status));
    });
    this.con.connect(function(err){
      if(err){
        console.log(err);
      }
      console.log('connection to db established')
    });

  }
  

  listen(){
    var that = this;
    this.wss.on('connection', function(ws,request){
      ws.user_id = '1234';
      that.new_connection(ws,request);
    })
  }

/**
 * Get company_id
 * @returns {company_id}
 * @params {user_id}
 * */
 get_company_id(user_id) {
    //call get user id and get result
    var sql = `select company_id from oauth_users where user_id = "${user_id}"`;
    return new Promise(resolve => {
      this.con.query(sql, function (err, result) {
        if (err) {
          console.log(`SQL ERROR:  ${err}`)
          return (0);
        }
        if (result.length > 0) {
         var resultStringified = JSON.stringify(result);
          result = JSON.parse(resultStringified);
          console.log(JSON.stringify(result));
          result = result[0].company_id;
          resolve(result);
        }
      });
    });
  }

/** 
 * 
 * @function authenticate
 * This function checks to see if the submitted token from websocket client is valid
 *  @param {token}
 *  @returns {bool}
 * */ 
  async authenticate(token){
    var that = this;
    console.log('hitting auth')
    return new Promise((resolve, reject) => {
     //datetime = dateTime();  

      //prepare sql statement
      var sql = `select access_token,expires from oauth_access_tokens where access_token = "${token}"`;
      //execute sql statement
      try{
        that = this;
      that.con.query(sql, function (err, result) {
        if(err){
          console.log('rejecting');
          reject(`Mysql error: ${err}`);
        } else if (result.length > 0){
          console.log("resolved")
          resolve(1)
    
        } else {
          console.log('rejecting invalid token');
          reject('invalid token')
        }

      });
    } catch {
      reject('invalid token');
    } 

      });
  }
  async new_client(ws, access_token){
    ws.id = access_token;

    ws.user_id = await this.get_user_id(access_token);
    ws.my_company = await this.get_company_id(ws.user_id);
    ws.my_numbers = await this.get_my_numbers(ws.my_company);
    var blob = await this.get_blob(access_token);
    ws.send(blob);
    this.wss.clients.forEach(function each(client){
    console.log('The user id is '+client.user_id);
    console.log('The company_id is '+client.my_company);
    console.log('my_numbers are '+JSON.stringify(client.my_numbers));
    });
    console.log(JSON.parse(this.wss.clients));
  }

  async new_connection(ws,response){
   // console.log(response);
  //PARSE THE TOK
  try{   
    var that = this
    var header = await JSON.stringify(response['headers']['sec-websocket-protocol']);

  console.log('Client with ID '+header+'  has just connected')
  //Parse acess token and assign to variable
  var arr = header.split(','); 
  var trimmer = arr[1].substring(0, arr[1].length - 1);
  var access_token = trimmer.trim();
  console.log(access_token);
   
    //Authenticate access token.
    var isAuthed = await that.authenticate(access_token)
    console.log(isAuthed)
    //User is authenticated
    await this.new_client(ws, access_token);
    this.wss.clients.forEach(function each(client){
      console.log(client.user_id);
      console.log(client.my_company);
      console.log(client.my_numbers);
      });

  }  catch(e) {
    ws.close();
    return('An error has occured' );    
  }
}

  async get_user_id(access_token) {
    var sql = `SELECT user_id FROM oauth_access_tokens where access_token = '${access_token}'`;
    return new Promise((resolve, reject) => {
      this.con.query(sql, function (err, result) {
        if (err) {
          console.log(`SQL ERROR:  ${err}`)
          return (0);
        }
        if (result.length > 0) {
          var user_id = JSON.stringify(result);
          console.log(`SQL QUERY COMPLETE: DATA: ${user_id}`);
          user_id = JSON.parse(user_id);

          user_id = user_id[0].user_id;
          resolve(user_id);

        }

      });

    });
  }

  async send_blob(socketid, ws) {
    array = get_blob(socketid);
    console.log(JSON.stringify(array))

    ws.send(blob);

  }
//-----------------------------------------
get_my_numbers(company_id){
  return new Promise(resolve => {
  //call company id and get result
    var sql = `select phoneNumber,id from Companies_PhoneNumbers where idCompanies = "${company_id}"`;
    this.con.query(sql, function(err,result){
      if(err){
        console.log(`SQL ERROR:  ${err}`)
        callback(0);
      }
      if(result.length > 0){
        

        resolve(result);
      }
     });
  });
}
//-------------------------
//Get Conversation

get_conversation(phoneNumber_id){
  return new Promise(resolve => {
      
      var sql = `select idConversation,phoneNumber_id,PhoneNumber_external from PhoneNumbers_Conversations where phoneNumber_id = "${phoneNumber_id}"`;

      
      
      this.con.query(sql, function(err,result)
      
      {
        console.log(JSON.stringify(result));

        if(err){
          console.log(`SQL ERROR:  ${err}`)
          resolve(0);
        }
        if(result.length > 0){
          //result[i]['conversations'] = result2;
         
          var result2 = JSON.stringify(result);
          var result2 = JSON.parse(result2);
          resolve(result2);
        }
      });
    });
  }
  //-------------------------------------
//Get messages
get_messages(conversation_id){
  return new Promise(resolve => {
  //select 
  var sql = `select body,direction,time,idPhoneNumber_Conversations_Messages from PhoneNumber_Conversations_Messages where idPhoneNumber_Conversations = "${conversation_id}"`;
 
    this.con.query(sql, function(err,result){
      if(err){
        console.log(`SQL ERROR:  ${err}`)
        return(0);
      }
      if(result.length > 0){
        var resultStringified = JSON.stringify(result);
        var result = JSON.parse(resultStringified);
        resolve(result)
        
      }
    });
  });
}

client_blob(token){
  return new Promise((resolve, reject) => {
    this.get_blob(token)
        .then((blob) => {console.log(blob)})
        .catch(reject)
});
}

//Get blob2
async get_blob(access_token){
  let that = this;
return new Promise(async function(resolve, reject)  {
 
  try {
    let user_id = await that.get_user_id(access_token);
    console.log(`Got user id: ${user_id}`);
    let company_id = await that.get_company_id(user_id);
    console.log(`Got company id: ${company_id}`);
    let phone_numbers = await that.get_my_numbers(company_id);
    var conversation_count = 0;
    for ( var key in phone_numbers) {
     
      console.log(phone_numbers[key]["id"]);

      //push conversations onto array
      phone_numbers[key].conversations = await that.get_conversation(phone_numbers[key]["id"]);
      conversation_count++;
    
      //get messages for conversations
      for (var j = 0; j < phone_numbers[key].conversations.length; j++) {
        var conversation_id = phone_numbers[key].conversations[j].idConversation;
        var message = await that.get_messages(conversation_id);
        phone_numbers[key].conversations[j].messages = message;
      }
    }
    console.log(`Got conversations and messages`); 

    var array = {
      'function': 'init_blob',
      'data': phone_numbers
    };

    console.log(`Got init_blob`);

    //returning array
    return array;


  } catch(e){
    console.log(`Error generating blob: ${e}`);
  }
  
});
}

//------------------------------------------
  //Get init blob
  
      
    
  
    
  

}

module.exports = new Smsserver;
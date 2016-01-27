<?php

//Get config from config file
$configText = file_get_contents("./config.json");
$configJson = json_decode($configText, true);

//Construct login/password array
$fields = array(
  'login' => urlencode($configJson['login']),
  'password' => urlencode($configJson['password']),
);

//url-ify the data for the POST
$fields_string = "";
foreach($fields as $key=>$value) {
  $fields_string .= $key.'='.$value.'&';
}
rtrim($fields_string, '&');

//open connection
$ch = curl_init();

//set the url, number of POST vars, POST data
curl_setopt($ch,CURLOPT_URL, $configJson['message_url']);
curl_setopt($ch,CURLOPT_POST, count($fields));
curl_setopt($ch,CURLOPT_POSTFIELDS, $fields_string);
curl_setopt($ch,CURLOPT_RETURNTRANSFER, true);

//execute post
$result = curl_exec($ch);

//handling errors
if($result === false)
{
  curl_close($ch);
  echo "Fail with Curl";
}

//close connection
curl_close($ch);

$json = array_reverse(json_decode($result, true));

//get all message's id already parsed
$myfile = fopen("./lastmsgID.txt", "r");
$lastID = fread($myfile,filesize("./lastmsgID.txt"));
fclose($myfile);

foreach ($json as $msg) {
  //retrieve link in title
  preg_match_all('/<.*<\/a>/i', $msg['title'], $result);

  if (!empty($result)) {
    //replace <a> by Slack compliant syntaxe
    try {
      $a = new SimpleXMLElement($result[0][0]);
      $msg['title'] = preg_replace('#<.*<\/a>#', "<https://intra.epitech.eu" . $a['href'] . "|" . $a[0] . ">", $msg['title']);
    } catch (Exception $e) {
    }
  }

  //If the id is not in the id's file
  if (strpos($lastID, $msg["id"]) === false) {
    //add current id in file
    $fp = fopen('./lastmsgID.txt', 'a');
    fwrite($fp, $msg["id"].PHP_EOL);
    fclose($fp);
    echo $msg["title"] . PHP_EOL;

    //prepare to send title title to Slack
    $fields = array();
    $fields = array(
      'text' => $msg["title"],
    );
    $json = json_encode($fields);

    //sending to Slack
    $ch = curl_init();
    curl_setopt($ch,CURLOPT_URL, $configJson['slack_hook_url']);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
      'Content-Type: application/json',
      'Content-Length: ' . strlen($json)));

      $result = curl_exec($ch);
    }
  }

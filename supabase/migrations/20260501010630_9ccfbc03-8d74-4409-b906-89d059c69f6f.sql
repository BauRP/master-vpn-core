
INSERT INTO public.servers (protocol, config, host, port, country_code, country_name, city, flag, source, is_alive, latency_ms)
VALUES
  ('vless','vless://rescue@fra.master.vpn:443','fra.master.vpn',443,'DE','Германия','Франкфурт','🇩🇪','rescue',true,38),
  ('vless','vless://rescue@lon.master.vpn:443','lon.master.vpn',443,'GB','Великобритания','Лондон','🇬🇧','rescue',true,52),
  ('vless','vless://rescue@par.master.vpn:443','par.master.vpn',443,'FR','Франция','Париж','🇫🇷','rescue',true,46),
  ('vless','vless://rescue@ams.master.vpn:443','ams.master.vpn',443,'NL','Нидерланды','Амстердам','🇳🇱','rescue',true,42),
  ('vless','vless://rescue@ala.master.vpn:443','ala.master.vpn',443,'KZ','Казахстан','Алматы','🇰🇿','rescue',true,28),
  ('vless','vless://rescue@tyo.master.vpn:443','tyo.master.vpn',443,'JP','Япония','Токио','🇯🇵','rescue',true,118),
  ('vless','vless://rescue@sgp.master.vpn:443','sgp.master.vpn',443,'SG','Сингапур','Сингапур','🇸🇬','rescue',true,156),
  ('vless','vless://rescue@hkg.master.vpn:443','hkg.master.vpn',443,'HK','Гонконг','Гонконг','🇭🇰','rescue',true,142),
  ('vless','vless://rescue@sel.master.vpn:443','sel.master.vpn',443,'KR','Южная Корея','Сеул','🇰🇷','rescue',true,128),
  ('vless','vless://rescue@nyc.master.vpn:443','nyc.master.vpn',443,'US','США','Нью-Йорк','🇺🇸','rescue',true,98),
  ('vless','vless://rescue@lax.master.vpn:443','lax.master.vpn',443,'US','США','Лос-Анджелес','🇺🇸','rescue',true,142),
  ('shadowsocks','ss://rescue@tor.master.vpn:8388','tor.master.vpn',8388,'CA','Канада','Торонто','🇨🇦','rescue',true,108),
  ('shadowsocks','ss://rescue@gru.master.vpn:8388','gru.master.vpn',8388,'BR','Бразилия','Сан-Паулу','🇧🇷','rescue',true,184);

jogo.carregarDados = function() {
	log('jogo.carregarDados()');
	var requisicao = opensocial.newDataRequest();
	var visualizador = requisicao.newFetchPersonRequest(opensocial.IdSpec.PersonId.VIEWER);

	requisicao.add(visualizador, 'visualizador');
	requisicao.send(function(resposta) {
		log(resposta);
		jogo.visualizador = resposta.get('visualizador').getData();

		if (jogo.visualizador && jogo.visualizador.isOwner()) {
			jogo.carregarDonoAmigos();
			
			$('#iniciar-jogo').click(function() {
				$('#iniciar-jogo, #nome, #novo-jogo, #letras-digitadas').toggle('slow', function() {
					gadgets.window.adjustHeight();
				});
			});
			$('#iniciar-jogo').show();
		} else {
			$('#navegar').click(function() {
				gadgets.views.requestNavigateTo(new gadgets.views.View('canvas'));
			});
			$('#navegar').show();
		}
	});
};

jogo.carregarDonoAmigos = function() {
	log('jogo.carregarDonoAmigos()');
	var idAmigos = opensocial.newIdSpec( {
		'userId' : opensocial.IdSpec.PersonId.OWNER,
		'groupId' : 'FRIENDS'
	});

	var parametros = {};
	parametros[opensocial.DataRequest.PeopleRequestFields.FIRST] = 1;
	parametros[opensocial.DataRequest.PeopleRequestFields.MAX] = 1;

	var requisicao = opensocial.newDataRequest();
	var dono = requisicao.newFetchPersonRequest(opensocial.IdSpec.PersonId.OWNER);
	var amigos = requisicao.newFetchPeopleRequest(idAmigos, parametros);

	requisicao.add(dono, 'dono');
	requisicao.add(amigos, 'amigos');

	requisicao.send(function(resposta) {
		log(resposta);
		if (resposta.hadError()) {
			jogo.mensagem.erro(resposta);
			return;
		}

		if (resposta.get('dono').hadError()) {
			jogo.mensagem.erro(resposta.get('dono'));
			return;
		}

		if (resposta.get('amigos').hadError()) {
			jogo.mensagem.erro(resposta.get('amigos'));
			return;
		}

		jogo.dono = resposta.get('dono').getData();
		jogo.numeroAmigos = resposta.get('amigos').getData().getTotalSize();
		jogo.carregarNovoAmigo();

		gadgets.window.adjustHeight();
	});
}

jogo.carregarNovoAmigo = function() {
	log('jogo.carregarNovoAmigo()');
	if (jogo.numeroAmigos == 0) {
		var mensagem = prefs.getMsg('nao_ha_amigos');

		var dominio = opensocial.getEnvironment().getDomain();
		if (dominio == jogo.dominio.GOOGLE) {
			mensagem += '<br />' + prefs.getMsg('amigos_google');
		} else if (dominio == jogo.dominio.ORKUT) {
			mensagem += '<br />' + prefs.getMsg('amigos_orkut');
		}

		jogo.mensagem.erro(mensagem);
		return;
	}

	var idAmigos = opensocial.newIdSpec( {
		'userId' : opensocial.IdSpec.PersonId.OWNER,
		'groupId' : opensocial.IdSpec.GroupId.FRIENDS
	});

	var parametros = {};
	parametros[opensocial.DataRequest.PeopleRequestFields.FIRST] = Math.floor(Math.random() * jogo.numeroAmigos);
	parametros[opensocial.DataRequest.PeopleRequestFields.MAX] = 1;
	parametros[opensocial.DataRequest.PeopleRequestFields.PROFILE_DETAILS] = [ opensocial.Person.Field.NAME, opensocial.Person.Field.THUMBNAIL_URL, opensocial.Person.Field.PROFILE_URL ];

	var requisicao = opensocial.newDataRequest();
	var amigos = requisicao.newFetchPeopleRequest(idAmigos, parametros);

	$('#nome').html('');
	$('#nome').addClass('ajax-loader');
	
	var requisicao = opensocial.newDataRequest();
	requisicao.add(amigos, 'amigos');
	requisicao.send(function(resposta) {
		log(resposta);
		$('#nome').removeClass('ajax-loader');
		
		if (resposta.hadError()) {
			jogo.mensagem.erro(resposta);
			return;
		}

		if (resposta.get('amigos').hadError()) {
			jogo.mensagem.erro(resposta.get('amigos'));
			return;
		}

		var amigos = resposta.get('amigos').getData();
		amigos.each(function(pessoa) {
			jogo.amigo = pessoa;
		});

		var nome = jogo.amigo.getField(opensocial.Person.Field.NAME);
		if (!nome) {
			jogo.mensagem.erro('amigo_sem_nome', true);
			return;
		}

		var primeiroNome = nome.getField(opensocial.Name.Field.GIVEN_NAME);
		var sobrenome = nome.getField(opensocial.Name.Field.FAMILY_NAME);

		if (primeiroNome && sobrenome) {
			jogo.palavra = primeiroNome + ' ' + sobrenome;
		} else {
			var nomeNaoEstruturado = nome.getField(opensocial.Name.Field.UNSTRUCTURED);
			if (nomeNaoEstruturado) {
				jogo.palavra = nomeNaoEstruturado;
			} else {
				jogo.palavra = jogo.amigo.getDisplayName();
			}
		}

		jogo.pontos.carregar();
		jogo.desenharLetras(false);
		log(jogo);
	});
};

jogo.atividade.criar = function(sucesso) {
	log('jogo.atividade.criar(sucesso=' + sucesso + ')');
	var titulo = sucesso ? 'atividade_titulo_sucesso' : 'atividade_titulo_game_over';
	var corpo = [ '<table><tr><td style="width: 100px;">',
	              '<img src="' + (sucesso ? jogo.img.atividade.salvo : jogo.img.atividade.enforcado) + '" height="75" width="58">',
	              '</td><td style="width: 180px;">',
	              '<span style="font-size: large; font-weight: bold;">Pontos: ${pontuacao.pontos}</span></td><td>',
	              '<span style="color: rgb(0, 0, 170); font-size: large;">Amigos salvos: ${pontuacao.salvos}</span><br>',
	              '<span style="color: rgb(170, 0, 0); font-size: large;">Amigos enforcados: ${pontuacao.enforcados}</span>',
	              '</td></tr></table>' ].join('');

	var parametrosTemplate = {};
	parametrosTemplate.dono = jogo.dono.getDisplayName();
	parametrosTemplate.amigo = jogo.amigo.getDisplayName();
	parametrosTemplate.pontuacao = jogo.pontuacao;

	var parametros = {};
	parametros[opensocial.Activity.Field.BODY] = jogo.aplicarParametros(corpo);
	parametros[opensocial.Activity.Field.BODY_ID] = corpo;
	parametros[opensocial.Activity.Field.STREAM_FAVICON_URL] = jogo.img.icone;
	parametros[opensocial.Activity.Field.TEMPLATE_PARAMS] = parametrosTemplate;
	parametros[opensocial.Activity.Field.TITLE] = jogo.aplicarParametros(prefs.getMsg(titulo), { link: true });
	parametros[opensocial.Activity.Field.TITLE_ID] = titulo;

	var atividade = opensocial.newActivity(parametros);
	opensocial.requestCreateActivity(atividade, opensocial.CreateActivityPriority.HIGH, function(resposta) {
		log(resposta);
		if (resposta.hadError()) {
			//jogo.mensagem.erro('atividade_nao_criada', true, resposta);
		}
	});
}

jogo.pontos.carregar = function() {
	log('jogo.pontos.carregar()');
	var requisicao = opensocial.newDataRequest();
	var idDono = opensocial.newIdSpec( {
		'userId' : opensocial.IdSpec.PersonId.VIEWER
	});
	var dados = requisicao.newFetchPersonAppDataRequest(idDono, '*');

	requisicao.add(dados, 'pontuacao');
	requisicao.send(function(resposta) {
		log(resposta);
		if (resposta.hadError()) {
			jogo.mensagem.erro(resposta);
			return;
		}

		if (resposta.get('pontuacao').hadError()) {
			jogo.mensagem.erro(resposta.get('pontuacao'));
			return;
		}

		var dados = resposta.get('pontuacao').getData();
		var idDono = 0;
		
		if (jogo.dono) {
			idDono = jogo.dono.getId();
		} else if (opensocial.data.DataContext.getDataSet('dono')) {
			idDono = opensocial.data.DataContext.getDataSet('dono').id;
		} else {
			return;
		}
		
		if (!dados[idDono]) {
			return;
		}
		
		dados = dados[idDono];
		if (dados['pontos'] && dados['pontos'] != '') {
			jogo.pontuacao.pontos = dados['pontos'];
		}
		
		if (dados['salvos'] && dados['salvos'] != '') {
			jogo.pontuacao.salvos = dados['salvos'];
		}
		
		if (dados['enforcados'] && dados['enforcados'] != '') {
			jogo.pontuacao.enforcados = dados['enforcados'];
		}

		jogo.pontos.exibir();
	});
};

jogo.pontos.salvar = function() {
	log('jogo.pontos.salvar()');
	
	var requisicao = opensocial.newDataRequest();
	requisicao.add(requisicao.newUpdatePersonAppDataRequest('pontos', jogo.pontuacao.pontos + ""));
	requisicao.add(requisicao.newUpdatePersonAppDataRequest('salvos', jogo.pontuacao.salvos + ""));
	requisicao.add(requisicao.newUpdatePersonAppDataRequest('enforcados', jogo.pontuacao.enforcados + ""));
	
	requisicao.send(function(resposta) {
		log(resposta);
		if (resposta.hadError()) {
			//jogo.mensagem.erro(resposta);
		}
	});

	jogo.pontos.exibir();
};

jogo.compartilhar = function() {
	log('jogo.compartilhar()');

	var dominio = opensocial.getEnvironment().getDomain();
	if (dominio == jogo.dominio.ORKUT) {
		var parametros = {};
		parametros[opensocial.Message.Field.TITLE] = prefs.getMsg('email_titulo');
		parametros[opensocial.Message.Field.TYPE] = opensocial.Message.Type.EMAIL;

		var mensagem = opensocial.newMessage(prefs.getMsg('email_corpo'), parametros);
		opensocial.requestSendMessage('VIEWER_FRIENDS', mensagem, function(resposta) {
			log(resposta);
			if (resposta.hadError()) {
				//jogo.mensagem.erro('email_nao_enviado', true, resposta);
			}
		});

		return;
	}

	var motivo = opensocial.newMessage(prefs.getMsg('requisicao_compartilhamento'));
	opensocial.requestShareApp('VIEWER_FRIENDS', motivo, function(resposta) {
		log(resposta);
		if (resposta.hadError()) {
			//jogo.mensagem.erro(resposta);
		}
	});
};

jogo.aplicarParametros = function(str, parametros) {
	if (parametros && parametros.link && jogo.amigo.getField(opensocial.Person.Field.PROFILE_URL)) {
		str = str.replace('${amigo}', '<a href="' + jogo.amigo.getField(opensocial.Person.Field.PROFILE_URL) + '">' + jogo.amigo.getDisplayName() + '</a>');
	} else {
		str = str.replace('${amigo}', jogo.amigo.getDisplayName());
	}
	
	str = str.replace('${dono}', jogo.dono.getDisplayName());
	str = str.replace('${pontuacao.salvos}', jogo.pontuacao.salvos);
	str = str.replace('${pontuacao.enforcados}', jogo.pontuacao.enforcados);
	str = str.replace('${pontuacao.pontos}', jogo.pontuacao.pontos);

	return str;
}
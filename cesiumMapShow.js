var viewer = new Cesium.Viewer('cesiumContainer', {
	
});

//設5秒延遲
setTimeout(function(){
    /*設定視野*/
	viewer.camera.flyTo({
	    destination : Cesium.Cartesian3.fromDegrees(120.659777, 24.138936, 200.0),
	    orientation : {
			heading : 0.0,
	        pitch : Cesium.Math.toRadians(-35.0),
	        roll : 0.0
	    }
	});
},5000);

/*禁止滑鼠滾輪移動視野*/
viewer.scene.screenSpaceCameraController.enableTilt = false;

/*設定監聽器*/
document.addEventListener('keydown', function(e) {
    setKey(e);
}, false);

/*左右旋轉照相機*/
function setKey(event) {
	var axis = new Cesium.Cartesian3(viewer.camera.position.x, viewer.camera.position.y, viewer.camera.position.z) //軸
    if (event.keyCode === 39) {  // 右鍵 
        viewer.camera.look(axis, 0.01);
    } else if (event.keyCode === 37) {  // 左鍵
        viewer.camera.look(axis, -0.01);
    }
}
var townArry = ['中區','北區', '北屯區', '南區', '南屯區', '后里區', '和平區', '外埔區', 
				'大安區', '大甲區', '大肚區', '大里區', '大雅區', '太平區', '新社區', 
				'東勢區', '東區', '梧棲區', '沙鹿區', '清水區', '潭子區', '烏日區', 
				'石岡區', '神岡區', '西區', '西屯區', '豐原區', '霧峰區', '龍井區'];
var selectedTown = [];

/*
viewer.dataSources.add(Cesium.GeoJsonDataSource.load('台中區界圖.geojson', {
  stroke: Cesium.Color.BLACK,
  fill: Cesium.Color.PINK,
  strokeWidth: 10,
  markerSymbol: '?'
}));
*/

$.getJSON('台中區界圖.geojson', function (data) {
	var polygonArry = [];
	for (i = 0; i < data.features.length; i++) {
		var latlngArry = [];
		for (j = 0; j < data.features[i].geometry.coordinates[0].length; j++) {
			var townLatLngArry = [data.features[i].geometry.coordinates[0][j][0], data.features[i].geometry.coordinates[0][j][1]];
			latlngArry.push(townLatLngArry);
		}
		polygonArry.push({latlngArry});
	}
	//console.log(polygonArry)
	//console.log(polygonArry[3].latlngArry)
	for (k = 0; k < data.features.length; k++) {
		window['polygon'+k] = new Terraformer.Primitive({
		  "type": "Polygon",
		  "coordinates": [
			polygonArry[k].latlngArry
		  ]
		});
	}
});

/*設定camera移動時所要做的動作*/
viewer.camera.moveEnd.addEventListener(function() {
	/*抓取camera視野中心點的座標*/
	var windowPosition = new Cesium.Cartesian2(viewer.container.clientWidth / 2, viewer.container.clientHeight / 2);
	var pickRay = viewer.scene.camera.getPickRay(windowPosition);
	var pickPosition = viewer.scene.globe.pick(pickRay, viewer.scene);
	var pickPositionCartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(pickPosition);
	var longitude = pickPositionCartographic.longitude * (180 / Math.PI)
	var latitude = pickPositionCartographic.latitude * (180 / Math.PI)
	var viewRect = viewer.camera.computeViewRectangle();
	/*水平視野範圍*/
	var horizontalDegrees = Cesium.Math.toDegrees(viewRect.east - viewRect.west) / 360.0;
	/*垂直視野範圍*/
	var verticalDegrees = Cesium.Math.toDegrees(viewRect.north - viewRect.south) / 180.0;
	
	var point = new Terraformer.Primitive({
	  "type": "Point",
	  "coordinates": [longitude, latitude] 
	});
	
	for (n = 0; n < townArry.length; n++) {
		if (point.within(window['polygon'+n]) == true) {
			loadSHP(n, longitude, latitude, horizontalDegrees, verticalDegrees);
		}
	}
})

function loadSHP(id, longitude, latitude, horizontalDegrees, verticalDegrees){
	/*紀錄已命名的Town變數*/
	if (selectedTown.indexOf(id) == -1 ) {
		selectedTown.push(id)
		$.ajax({
			url: townArry[id]+'建物圖.geojson',
			dataType: 'json',
			async: false,
			success: function(data) {
				window['data'+id] = data;
				//console.log(id)
			}
		});
	}
	
	/*建立新的geojson檔*/
	var obj = {
	   "type": "FeatureCollection",
	   "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
	   features: []
	};
	
	//console.log(window['data'+id].features[0].geometry.coordinates[0][0][1])
	/*抓取camera 視野範圍的building*/
	for (var i = 0; i < window['data'+id].features.length; i++){
		/*判斷Polygon屬性*/
		if (window['data'+id].features[i].geometry.type == 'MultiPolygon') {
			if (window['data'+id].features[i].geometry.coordinates[0][0][0][0] <= longitude + horizontalDegrees*120 && window['data'+id].features[i].geometry.coordinates[0][0][0][0] >= longitude - horizontalDegrees*120){
				if (window['data'+id].features[i].geometry.coordinates[0][0][0][1] <= latitude + verticalDegrees*100 && window['data'+id].features[i].geometry.coordinates[0][0][0][1] >= latitude - verticalDegrees*50){
					obj.features.push(window['data'+id].features[i])
					/*移除掉已存在的建物*/
					window['data'+id].features.splice(i, 1);
				}
			}
		}else if (window['data'+id].features[i].geometry.type == 'Polygon') {
			if (window['data'+id].features[i].geometry.coordinates[0][0][0] <= longitude + horizontalDegrees*120 && window['data'+id].features[i].geometry.coordinates[0][0][0] >= longitude - horizontalDegrees*120){
				if (window['data'+id].features[i].geometry.coordinates[0][0][1] <= latitude + verticalDegrees*100 && window['data'+id].features[i].geometry.coordinates[0][0][1] >= latitude - verticalDegrees*50){
					obj.features.push(window['data'+id].features[i])
					/*移除掉已存在的建物*/
					window['data'+id].features.splice(i, 1);
				}
			}
		}
	}
	/*傳obj 到fuction(load)*/
	return load(obj);
}

/*讀取新geojson檔*/
function load(promise){
    var promise = Cesium.GeoJsonDataSource.load(promise);
    promise.then(function(dataSource) {
		/*加入建築物*/
        viewer.dataSources.add(dataSource).then(function() {
        	console.log("pc")
        	$('#loader').hide();
        });
        var entities = dataSource.entities.values;
		
        /*讀取entities 矩陣*/
        for (var i = 0; i < entities.length; i++) {
            var entity = entities[i];
			//console.log(entity.properties.ID)
            entity.polygon.height = 0;
			/*將建築物拉高*/
			entity.polygon.extrudedHeight = entity.properties.建物樓層數 * 3.6;
            entity.polygon.outline = false;
            /*設定不同房屋型態不同外觀*/
            if (entity.properties.房屋型態碼 < 2){
                entity.polygon.material = Cesium.Color.CADETBLUE.withAlpha(0.8);
            }else if(entity.properties.房屋型態碼 < 4){
                entity.polygon.material = Cesium.Color.BURLYWOOD.withAlpha(0.8);
            }else{
				entity.polygon.material = Cesium.Color.YELLOW.withAlpha(0.8);
            }
        }
    }).otherwise(function(error){
        /*顯示讀取時的錯誤訊息*/
        window.alert(error);
    });
}

/*共管資料*/
$.getJSON('http://dig.taichung.gov.tw/json_link/easygo_data.aspx', function (data) {
	console.log(data.length)
	console.log(data[0])
	for (i = 0; i < data.length; i++){
		var pinBuilder = new Cesium.PinBuilder();
		// Set a label's rightToLeft after init
		Cesium.Label.enableRightToLeftDetection = true;
		var bluePin = viewer.entities.add({
			name : data[i].CASE_KIND,
			position : Cesium.Cartesian3.fromDegrees(data[i].X_CP, data[i].Y_CP),
			billboard : {
				image : pinBuilder.fromColor(Cesium.Color.ROYALBLUE, 48).toDataURL(),
				verticalOrigin : Cesium.VerticalOrigin.BOTTOM
			},
			label : {
				id: '共管' + i,
				font : '12px Helvetica',
				text: 'CASE_KIND:' + data[i].CASE_KIND + '\n' + 'LOCATION:' + data[i].LOCATION
			}
		});
	}
});

/*地標資料*/
$.getJSON('重要地標.geojson', function (data) {
	console.log(data)
	for (i = 0; i < data.features.length; i++) {
		// Set a label's rightToLeft after init
		Cesium.Label.enableRightToLeftDetection = true;
		var myLabelEntity = viewer.entities.add({
		  position : Cesium.Cartesian3.fromDegrees(data.features[i].geometry.coordinates[0], data.features[i].geometry.coordinates[1]),
		  label : {
			id: '地標' + i,
			font : '18px Helvetica',
			fillColor : Cesium.Color.OLDLACE,
			outlineColor : Cesium.Color.BLACK,
			outlineWidth : 4,
			text: data.features[i].properties.地標名稱
		  }
		});
	}
});

